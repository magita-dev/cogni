import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ExamResult() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.attempt(attemptId).then(setAttempt);
  }, [attemptId]);

  if (!attempt) return <div className="container muted">Loading…</div>;
  if (attempt.status !== "submitted") return <div className="container muted">This assessment hasn't been submitted yet.</div>;

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>✓</div>
        <h2>Assessment submitted</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Thanks — your responses have been recorded and are being processed. The recruiter will follow up with next steps.
        </p>
        <div className="grid-2" style={{ marginTop: 26, textAlign: "left" }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="section-label">MCQ score</div>
            <div style={{ fontSize: 24, fontFamily: "var(--font-mono)" }}>
              {attempt.score.mcqCorrect}/{attempt.score.mcqTotal}
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="section-label">Coding tests passed</div>
            <div style={{ fontSize: 24, fontFamily: "var(--font-mono)" }}>
              {attempt.score.codingPassed}/{attempt.score.codingTotalTests}
            </div>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 26 }} onClick={() => navigate("/exams")}>
          Back to assessments
        </button>
      </div>
    </div>
  );
}
