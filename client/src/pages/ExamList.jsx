import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ExamList({ user }) {
  const [exams, setExams] = useState([]);
  const [starting, setStarting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.exams().then(setExams);
  }, []);

  const start = async (examId) => {
    setStarting(examId);
    try {
      const attempt = await api.startAttempt(examId, user.id);
      navigate(`/attempt/${attempt.id}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="container">
      <div className="section-label">Available assessments</div>
      <h2 style={{ marginBottom: 18 }}>Welcome, {user.name.split(" ")[0]}</h2>
      {exams.map((e) => (
        <div className="card" key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15.5 }}>{e.title}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {e.questionCount} questions · {e.durationMinutes} minutes · webcam &amp; tab monitoring active during this test
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => start(e.id)} disabled={starting === e.id}>
            {starting === e.id ? "Starting…" : "Start assessment"}
          </button>
        </div>
      ))}
      {exams.length === 0 && <div className="empty-state">No assessments assigned yet.</div>}
    </div>
  );
}
