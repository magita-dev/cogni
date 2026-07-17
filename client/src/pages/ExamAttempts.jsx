import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";

export default function ExamAttempts() {
  const { examId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [exam, setExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.examAttempts(examId).then(setAttempts);
    api.exam(examId, "recruiter").then(setExam);
  }, [examId]);

  const sorted = [...attempts].sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0));

  return (
    <div className="container">
      <Link to="/recruiter" className="link-btn">
        ← All assessments
      </Link>
      <h2 style={{ margin: "10px 0 18px" }}>{exam?.title}</h2>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Status</th>
                <th>Score</th>
                <th>Plagiarism</th>
                <th>Integrity risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.userName}</div>
                    <div className="muted mono" style={{ fontSize: 11.5 }}>
                      {a.userEmail}
                    </div>
                  </td>
                  <td className="muted">{a.status === "submitted" ? "Submitted" : "In progress"}</td>
                  <td className="mono">{a.score ? `${a.score.overall}/100` : "—"}</td>
                  <td className="mono">{a.plagiarism ? (a.plagiarism.maxSimilarity > 0 ? `${a.plagiarism.maxSimilarity}% match` : "clean") : "—"}</td>
                  <td>{a.risk ? <span className={`risk-badge risk-${a.risk.level}`}>{a.risk.level} · {a.risk.score}</span> : "—"}</td>
                  <td>
                    {a.status === "submitted" && (
                      <button className="btn" onClick={() => navigate(`/recruiter/report/${a.id}`)}>
                        View report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {sorted.length === 0 && <div className="muted" style={{ marginTop: 12 }}>No candidates have started this assessment yet.</div>}
    </div>
  );
}
