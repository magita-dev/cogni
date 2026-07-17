import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

function rid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function blankMcq() {
  return {
    id: rid("mcq"),
    type: "mcq",
    title: "",
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0
  };
}

function blankCoding() {
  return {
    id: rid("code"),
    type: "coding",
    title: "",
    prompt: "",
    language: "python",
    starterCode: { python: "", javascript: "" },
    testCases: [
      { input: "", output: "", hidden: false },
      { input: "", output: "", hidden: true }
    ]
  };
}

function QuestionCard({ q, index, onChange, onRemove }) {
  const update = (patch) => onChange({ ...q, ...patch });

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="pill">
          Q{index + 1} · {q.type === "mcq" ? "MCQ" : "Coding"}
        </span>
        <button className="link-btn" onClick={onRemove} style={{ color: "var(--danger)" }}>
          Remove
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          type="text"
          placeholder="Question title (e.g. Time Complexity)"
          value={q.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <textarea
          placeholder="Question prompt"
          value={q.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          rows={3}
          style={{ resize: "vertical" }}
        />

        {q.type === "mcq" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div className="section-label" style={{ marginTop: 4, marginBottom: 0 }}>
              Options (select the correct one)
            </div>
            {q.options.map((opt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctIndex === i}
                  onChange={() => update({ correctIndex: i })}
                />
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const options = [...q.options];
                    options[i] = e.target.value;
                    update({ options });
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="section-label" style={{ marginTop: 4, marginBottom: 0 }}>
              Starter code (Python)
            </div>
            <textarea
              value={q.starterCode.python}
              onChange={(e) => update({ starterCode: { ...q.starterCode, python: e.target.value } })}
              rows={3}
              className="mono"
              style={{
                background: "var(--code-bg)",
                border: "1px solid var(--code-border)",
                borderRadius: 8,
                color: "var(--code-text)",
                padding: "10px 12px",
                fontSize: 13,
                resize: "vertical"
              }}
            />
            <div className="section-label" style={{ marginTop: 4, marginBottom: 0 }}>
              Test cases
            </div>
            {q.testCases.map((tc, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Input"
                  value={tc.input}
                  onChange={(e) => {
                    const testCases = [...q.testCases];
                    testCases[i] = { ...testCases[i], input: e.target.value };
                    update({ testCases });
                  }}
                />
                <input
                  type="text"
                  placeholder="Expected output"
                  value={tc.output}
                  onChange={(e) => {
                    const testCases = [...q.testCases];
                    testCases[i] = { ...testCases[i], output: e.target.value };
                    update({ testCases });
                  }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={tc.hidden}
                    onChange={(e) => {
                      const testCases = [...q.testCases];
                      testCases[i] = { ...testCases[i], hidden: e.target.checked };
                      update({ testCases });
                    }}
                  />
                  hidden
                </label>
                <button
                  className="link-btn"
                  style={{ color: "var(--danger)" }}
                  onClick={() => update({ testCases: q.testCases.filter((_, idx) => idx !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="btn"
              style={{ width: "fit-content" }}
              onClick={() => update({ testCases: [...q.testCases, { input: "", output: "", hidden: false }] })}
            >
              + Add test case
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateTest() {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([blankMcq()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const mcqCount = questions.filter((q) => q.type === "mcq").length;
  const codingCount = questions.filter((q) => q.type === "coding").length;

  const updateQuestion = (id, next) => setQuestions((qs) => qs.map((q) => (q.id === id ? next : q)));
  const removeQuestion = (id) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const validate = () => {
    if (!title.trim()) return "Give the assessment a title.";
    if (questions.length === 0) return "Add at least one question.";
    for (const q of questions) {
      if (!q.title.trim() || !q.prompt.trim()) return "Every question needs a title and prompt.";
      if (q.type === "mcq" && q.options.some((o) => !o.trim())) return "Fill in all 4 MCQ options.";
      if (q.type === "coding" && q.testCases.some((tc) => !tc.input.trim() || !tc.output.trim())) {
        return "Fill in every test case's input and expected output.";
      }
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.createExam({
        title,
        durationMinutes: Number(duration) || 30,
        questions
      });
      navigate("/recruiter");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="section-label">Recruiter console</div>
      <h2 style={{ marginBottom: 18 }}>Create assessment</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-2">
          <div>
            <div className="section-label">Assessment title</div>
            <input type="text" placeholder="e.g. Backend Engineer — Round 1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="section-label">Duration (minutes)</div>
            <input type="text" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div className="muted mono" style={{ fontSize: 12, marginTop: 12 }}>
          {questions.length} questions · {mcqCount} MCQ · {codingCount} coding
        </div>
      </div>

      {questions.map((q, i) => (
        <QuestionCard key={q.id} q={q} index={i} onChange={(next) => updateQuestion(q.id, next)} onRemove={() => removeQuestion(q.id)} />
      ))}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className="btn" onClick={() => setQuestions((qs) => [...qs, blankMcq()])}>
          + Add MCQ
        </button>
        <button className="btn" onClick={() => setQuestions((qs) => [...qs, blankCoding()])}>
          + Add coding question
        </button>
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Publishing…" : "Publish assessment"}
      </button>
    </div>
  );
}
