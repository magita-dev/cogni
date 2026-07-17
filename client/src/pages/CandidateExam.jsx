import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import ProctorWebcam from "../components/ProctorWebcam.jsx";

export default function CandidateExam({ user }) {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [code, setCode] = useState({});
  const [language, setLanguage] = useState({});
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const answeredMcq = useRef({});

  useEffect(() => {
    api.attempt(attemptId).then(async (att) => {
      setAttempt(att);
      const ex = await api.exam(att.examId);
      setExam(ex);
      setSecondsLeft(ex.durationMinutes * 60 - Math.floor((Date.now() - att.startedAt) / 1000));
      
      const initCode = {};
      const initLang = {};
      ex.questions.forEach((q) => {
        if (q.type === "coding") {
          const existing = att.codingSubmissions?.[q.id];
          initLang[q.id] = existing?.language || q.language || "python";
          initCode[q.id] = existing?.code || q.starterCode[initLang[q.id]] || "";
        }
      });
      setCode(initCode);
      setLanguage(initLang);
      answeredMcq.current = { ...att.mcqAnswers };
    });
  }, [attemptId]);

  const flag = useCallback(
    (type, detail) => {
      if (!attemptId) return;
      api.proctorEvent(attemptId, type, detail).catch(() => {});
      const messages = {
        tabSwitch: "Tab switch detected — logged",
        faceMissing: "Face not visible — logged",
        multiFace: "Multiple faces detected — logged",
        paste: "Paste detected — logged",
        fullscreenExit: "Exited fullscreen — logged"
      };
      setToast(messages[type] || null);
      if (messages[type]) setTimeout(() => setToast(null), 2200);
    },
    [attemptId]
  );

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) flag("tabSwitch");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [flag]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) flag("fullscreenExit");
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [flag]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      finishSilently();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!exam || !attempt) return <div className="container muted">Loading assessment…</div>;

  const q = exam.questions[qIndex];
  const isMcq = q.type === "mcq";

  const selectMcq = (choiceIndex) => {
    answeredMcq.current[q.id] = choiceIndex;
    setAttempt((a) => ({ ...a, mcqAnswers: { ...a.mcqAnswers, [q.id]: choiceIndex } }));
    api.answerMcq(attemptId, q.id, choiceIndex);
  };

  const runCode = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await api.runCode(attemptId, q.id, code[q.id], language[q.id]);
      setRunResult(res);
    } finally {
      setRunning(false);
    }
  };

  const submitCode = async () => {
    setRunning(true);
    try {
      const res = await api.submitCode(attemptId, q.id, code[q.id], language[q.id]);
      setRunResult(res);
      // Refresh attempts local save reference
      setAttempt((prev) => ({
        ...prev,
        codingSubmissions: {
          ...prev.codingSubmissions,
          [q.id]: { code: code[q.id] }
        }
      }));
    } finally {
      setRunning(false);
    }
  };

  const finishSilently = async () => {
    setFinishing(true);
    for (const question of exam.questions) {
      if (question.type === "coding" && code[question.id]?.trim()) {
        await api.submitCode(attemptId, question.id, code[question.id], language[question.id]).catch(() => {});
      }
    }
    await api.finish(attemptId);
    if (document.fullscreenElement) document.exitFullscreen?.();
    navigate(`/result/${attemptId}`);
  };

  // Requirement: Double confirm dialog on manual submit
  const finish = async () => {
    if (finishing) return;
    const confirm = window.confirm(
      "Are you sure you want to submit your assessment? This will lock in all your answers and conclude your session."
    );
    if (!confirm) return;

    await finishSilently();
  };

  const mm = Math.floor((secondsLeft || 0) / 60);
  const ss = String((secondsLeft || 0) % 60).padStart(2, "0");

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      {toast && <div className="flag-toast">⚠ {toast}</div>}
      <ProctorWebcam onEvent={flag} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="section-label">{exam.title}</div>
          <h2 style={{ fontSize: 19 }}>
            Q{qIndex + 1}. {q.title}
          </h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 22, color: secondsLeft < 60 ? "var(--danger)" : "var(--text)" }}>
            {mm}:{ss}
          </div>
          {!document.fullscreenElement && (
            <button className="link-btn" onClick={enterFullscreen} style={{ fontSize: 11.5 }}>
              enter fullscreen
            </button>
          )}
        </div>
      </div>

      <div className="q-nav">
        {exam.questions.map((qq, i) => {
          // Requirement: Check typed code compared to the default starter code so untouched tasks don't turn green
          const starter = qq.starterCode?.[language[qq.id] || qq.language || "python"] || "";
          const typed = code[qq.id] || "";
          const isModified = typed.trim() !== "" && typed.trim() !== starter.trim();

          const answered = qq.type === "mcq" ? attempt.mcqAnswers[qq.id] !== undefined : isModified;

          return (
            <div key={qq.id} className={`q-nav-item ${i === qIndex ? "active" : ""} ${answered ? "answered" : ""}`} onClick={() => setQIndex(i)}>
              {i + 1}
            </div>
          );
        })}
      </div>

      <div className="card">
        <p style={{ whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.6 }}>{q.prompt}</p>

        {isMcq ? (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {q.options.map((opt, i) => (
              <div
                key={i}
                onClick={() => selectMcq(i)}
                className="user-chip"
                style={{
                  cursor: "pointer",
                  borderColor: attempt.mcqAnswers[q.id] === i ? "var(--gold)" : undefined
                }}
              >
                <span style={{ fontSize: 14 }}>{opt}</span>
                {attempt.mcqAnswers[q.id] === i && <span style={{ color: "var(--gold)" }}>✓</span>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <select
                value={language[q.id]}
                onChange={(e) => {
                  const lang = e.target.value;
                  setLanguage((l) => ({ ...l, [q.id]: lang }));
                  setCode((c) => ({ ...c, [q.id]: q.starterCode[lang] || "" }));
                }}
                style={{ width: 160 }}
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C (GCC)</option>
                <option value="cpp">C++ (G++)</option>
              </select>
              <span className="muted mono" style={{ fontSize: 11.5 }}>
                {q.testCases.filter((t) => !t.hidden).length} visible + hidden tests
              </span>
            </div>
            <textarea
              className="editor"
              spellCheck={false}
              value={code[q.id] || ""}
              onChange={(e) => setCode((c) => ({ ...c, [q.id]: e.target.value }))}
              onPaste={() => flag("paste")}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={runCode} disabled={running}>
                {running ? "Running…" : "Run sample tests"}
              </button>
              <button className="btn btn-primary" onClick={submitCode} disabled={running}>
                Save & test all
              </button>
            </div>

            {runResult && (
              <div style={{ marginTop: 14 }}>
                <div className="section-label">
                  {runResult.passedCount}/{runResult.total} tests passed
                </div>
                {runResult.results.map((r, i) => (
                  <div className="test-row" key={i}>
                    <span className={`dot ${r.passed ? "pass" : "fail"}`} />
                    {r.hidden ? (
                      <span className="muted">Hidden test {i + 1}</span>
                    ) : (
                      <span>
                        input: {r.input} → expected: {r.expected}, got: {r.actual ?? "—"}
                      </span>
                    )}
                    {r.error && <span style={{ color: "var(--danger)", display: "block" }}>{r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
        <button className="btn" disabled={qIndex === 0} onClick={() => setQIndex((i) => i - 1)}>
          ← Previous
        </button>
        {qIndex < exam.questions.length - 1 ? (
          <button className="btn" onClick={() => setQIndex((i) => i + 1)}>
            Next →
          </button>
        ) : (
          <button className="btn btn-danger" onClick={finish} disabled={finishing}>
            {finishing ? "Submitting…" : "Submit assessment"}
          </button>
        )}
      </div>
    </div>
  );
}