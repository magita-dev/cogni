import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { db, initDb } from "./db.js";
import { executeCode } from "./lib/codeRunner.js";
import { checkPlagiarism } from "./lib/plagiarism.js";
import { computeRiskScore } from "./lib/riskEngine.js";

const app = express();
app.use(cors());
app.use(express.json());

// Init connection
await initDb();

// 1. Properly Checked Authentication Route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password combination." });
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// 2. Sign up/Create Account Route
app.post("/api/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Please enter all required fields." });
  }

  const exists = db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "An account with that email already exists." });
  }

  const newUser = { id: `u_${nanoid(8)}`, name, email, password, role };
  db.data.users.push(newUser);
  await db.write();

  res.json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
});

// 3. Delete Assessment Route
app.delete("/api/exams/:id", async (req, res) => {
  const { id } = req.params;
  const index = db.data.exams.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Assessment not found" });
  }

  db.data.exams.splice(index, 1);
  // Also delete attempts linked to this exam
  db.data.attempts = db.data.attempts.filter((a) => a.examId !== id);
  await db.write();

  res.json({ success: true });
});

app.get("/api/users", (req, res) => {
  res.json(db.data.users);
});

app.get("/api/exams", (req, res) => {
  res.json(db.data.exams.map((e) => ({ ...e, questionCount: e.questions.length })));
});

app.get("/api/exams/:id", (req, res) => {
  const exam = db.data.exams.find((e) => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  if (req.query.role === "recruiter") {
    res.json(exam);
  } else {
    // Strip correct indices for candidates
    const sanitized = {
      ...exam,
      questions: exam.questions.map((q) => {
        const { correctIndex, testCases, ...rest } = q;
        return {
          ...rest,
          testCases: (testCases || []).map((t) => ({ input: t.input, hidden: t.hidden }))
        };
      })
    };
    res.json(sanitized);
  }
});

app.post("/api/exams", async (req, res) => {
  const { title, durationMinutes, questions } = req.body;
  const newExam = {
    id: `ex_${nanoid(8)}`,
    title,
    durationMinutes: Number(durationMinutes),
    questionCount: questions.length,
    questions
  };
  db.data.exams.push(newExam);
  await db.write();
  res.json(newExam);
});

app.post("/api/attempts", async (req, res) => {
  const { examId, userId } = req.body;
  const user = db.data.users.find((u) => u.id === userId);
  const attempt = {
    id: `att_${nanoid(8)}`,
    examId,
    userId,
    userName: user?.name || "Candidate",
    userEmail: user?.email || "",
    status: "started",
    startedAt: Date.now(),
    mcqAnswers: {},
    codingSubmissions: {},
    events: [],
    score: null,
    risk: { score: 0, level: "Low", breakdown: [] },
    plagiarism: { maxSimilarity: 0, matches: [] }
  };
  db.data.attempts.push(attempt);
  await db.write();
  res.json(attempt);
});

app.get("/api/attempts/:id", (req, res) => {
  const attempt = db.data.attempts.find((a) => a.id === req.params.id);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  res.json(attempt);
});

app.get("/api/exams/:examId/attempts", (req, res) => {
  const list = db.data.attempts.filter((a) => a.examId === req.params.examId);
  res.json(list);
});

// Custom Recruiter Student Attempt Metrics
app.get("/api/recruiter/analytics/students", (req, res) => {
  const candidates = db.data.users.filter((u) => u.role === "candidate");
  const attempts = db.data.attempts;

  const attemptedMap = new Set(attempts.map((a) => a.userId));

  const attemptedCandidates = candidates.filter((c) => attemptedMap.has(c.id));
  const notAttemptedCandidates = candidates.filter((c) => !attemptedMap.has(c.id));

  res.json({
    totalStudents: candidates.length,
    attemptedCount: attemptedCandidates.length,
    notAttemptedCount: notAttemptedCandidates.length,
    attemptedCandidates: attemptedCandidates.map((c) => ({ id: c.id, name: c.name, email: c.email })),
    notAttemptedCandidates: notAttemptedCandidates.map((c) => ({ id: c.id, name: c.name, email: c.email }))
  });
});

app.post("/api/attempts/:id/mcq", async (req, res) => {
  const { qid, correctIndex } = req.body;
  const att = db.data.attempts.find((a) => a.id === req.params.id);
  if (!att) return res.status(404).json({ error: "Attempt not found" });

  att.mcqAnswers[qid] = correctIndex;
  await db.write();
  res.json({ success: true });
});

app.post("/api/attempts/:id/run", async (req, res) => {
  const { qid, code, language } = req.body;
  const exam = db.data.exams.find((e) => e.questions.some((q) => q.id === qid));
  const q = exam?.questions.find((q) => q.id === qid);
  if (!q) return res.status(404).json({ error: "Question not found" });

  const testCases = q.testCases.filter((t) => !t.hidden);
  const results = [];
  let passedCount = 0;

  for (const tc of testCases) {
    const res = await executeCode(code, language, tc.input);
    const passed = !res.error && res.output.trim() === tc.output.trim();
    if (passed) passedCount++;
    results.push({
      input: tc.input,
      expected: tc.output,
      actual: res.output || null,
      error: res.error || null,
      passed,
      hidden: false
    });
  }

  res.json({ passedCount, total: testCases.length, results });
});

app.post("/api/attempts/:id/submit-code", async (req, res) => {
  const { qid, code, language } = req.body;
  const attempt = db.data.attempts.find((a) => a.id === req.params.id);
  const exam = db.data.exams.find((e) => e.id === attempt?.examId);
  const q = exam?.questions.find((q) => q.id === qid);
  if (!q || !attempt) return res.status(404).json({ error: "Not found" });

  const testCases = q.testCases;
  const results = [];
  let passedCount = 0;

  for (const tc of testCases) {
    const res = await executeCode(code, language, tc.input);
    const passed = !res.error && res.output.trim() === tc.output.trim();
    if (passed) passedCount++;
    results.push({
      input: tc.hidden ? "" : tc.input,
      expected: tc.hidden ? "" : tc.output,
      actual: tc.hidden ? "" : (res.output || null),
      error: res.error || null,
      passed,
      hidden: tc.hidden
    });
  }

  attempt.codingSubmissions[qid] = {
    code,
    language,
    passedCount,
    total: testCases.length,
    results
  };

  await db.write();
  res.json({ passedCount, total: testCases.length, results });
});

app.post("/api/attempts/:id/event", async (req, res) => {
  const { type, detail } = req.body;
  const att = db.data.attempts.find((a) => a.id === req.params.id);
  if (!att) return res.status(404).json({ error: "Attempt not found" });

  att.events.push({ id: nanoid(6), type, detail, ts: Date.now() });
  await db.write();
  res.json({ success: true });
});

app.post("/api/attempts/:id/finish", async (req, res) => {
  const att = db.data.attempts.find((a) => a.id === req.params.id);
  const exam = db.data.exams.find((e) => e.id === att?.examId);
  if (!att || !exam) return res.status(404).json({ error: "Not found" });

  att.status = "submitted";
  att.submittedAt = Date.now();

  // Evaluate scores
  let mcqCorrect = 0;
  let mcqTotal = 0;
  let codingPassed = 0;
  let codingTotalTests = 0;

  exam.questions.forEach((q) => {
    if (q.type === "mcq") {
      mcqTotal++;
      if (att.mcqAnswers[q.id] === q.correctIndex) {
        mcqCorrect++;
      }
    } else {
      const sub = att.codingSubmissions[q.id];
      if (sub) {
        codingPassed += sub.passedCount;
        codingTotalTests += sub.total;
      } else {
        codingTotalTests += q.testCases.length;
      }
    }
  });

  const mcqWeight = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 40 : 0;
  const codingWeight = codingTotalTests > 0 ? (codingPassed / codingTotalTests) * 60 : 0;
  const overall = Math.round(mcqWeight + codingWeight);

  att.score = { mcqCorrect, mcqTotal, codingPassed, codingTotalTests, overall };

  // Calculate plagiarism metrics
  let maxPlagiarism = 0;
  const plagMatches = [];

  const allSubmissions = db.data.attempts
    .filter((a) => a.examId === exam.id)
    .flatMap((a) =>
      Object.entries(a.codingSubmissions).map(([qid, sub]) => ({
        attemptId: a.id,
        userName: a.userName,
        qid,
        code: sub.code
      }))
    );

  Object.entries(att.codingSubmissions).forEach(([qid, sub]) => {
    const check = checkPlagiarism({ attemptId: att.id, qid, code: sub.code }, allSubmissions);
    if (check.maxSimilarity > maxPlagiarism) {
      maxPlagiarism = check.maxSimilarity;
    }
    check.matches.forEach((m) => plagMatches.push(m));
  });

  att.plagiarism = { maxSimilarity: maxPlagiarism, matches: plagMatches };
  att.risk = computeRiskScore(att.events, maxPlagiarism);

  await db.write();
  res.json({ success: true });
});

app.get("/api/reports/:attemptId", (req, res) => {
  const attempt = db.data.attempts.find((a) => a.id === req.params.attemptId);
  const exam = db.data.exams.find((e) => e.id === attempt?.examId);
  const user = db.data.users.find((u) => u.id === attempt?.userId);
  if (!attempt || !exam) return res.status(404).json({ error: "Report not found" });

  res.json({
    attempt,
    exam,
    user: user ? { name: user.name, email: user.email } : { name: "Candidate", email: "" },
    timeline: attempt.events
  });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`API online: http://localhost:${PORT}`));