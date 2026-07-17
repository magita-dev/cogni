import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function RecruiterDashboard() {
  const [exams, setExams] = useState([]);
  const [counts, setCounts] = useState({});
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.exams().then(async (list) => {
      setExams(list);
      const c = {};
      for (const e of list) {
        const attempts = await api.examAttempts(e.id);
        const submitted = attempts.filter((a) => a.status === "submitted");
        const avgScore = submitted.length
          ? Math.round(submitted.reduce((s, a) => s + (a.score?.overall || 0), 0) / submitted.length)
          : null;
        c[e.id] = {
          total: attempts.length,
          submitted: submitted.length,
          highRisk: attempts.filter((a) => a.risk?.level === "High").length,
          avgScore
        };
      }
      setCounts(c);
      setLoaded(true);
    });
  }, []);

  const totals = Object.values(counts).reduce(
    (acc, c) => ({
      candidates: acc.candidates + (c.total || 0),
      submitted: acc.submitted + (c.submitted || 0),
      highRisk: acc.highRisk + (c.highRisk || 0)
    }),
    { candidates: 0, submitted: 0, highRisk: 0 }
  );

  const handleDelete = async (examId, examTitle) => {
    if (
      window.confirm(
        `Are you sure you want to delete the assessment "${examTitle}"? This will permanently delete the assessment and all linked candidate results.`
      )
    ) {
      try {
        await api.deleteExam(examId);
        setExams((prev) => prev.filter((e) => e.id !== examId));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="container">
      <div className="section-label">Recruiter console</div>
      <h2 style={{ marginBottom: 18 }}>Assessments</h2>

      {loaded && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{exams.length}</div>
            <div className="stat-label">Active assessments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totals.candidates}</div>
            <div className="stat-label">Candidates invited</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totals.submitted}</div>
            <div className="stat-label">Submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: totals.highRisk > 0 ? "var(--danger)" : "var(--text)" }}>
              {totals.highRisk}
            </div>
            <div className="stat-label">Flagged high risk</div>
          </div>
        </div>
      )}

      {exams.map((e) => {
        const c = counts[e.id] || {};
        const pct = c.total ? Math.round((c.submitted / c.total) * 100) : 0;
        return (
          <div
            className="card clickable"
            key={e.id}
            onClick={() => navigate(`/recruiter/exam/${e.id}`)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15.5 }}>{e.title}</div>
              <div className="muted mono" style={{ fontSize: 12.5, marginTop: 6 }}>
                {e.questionCount} questions · {c.total ?? 0} attempts · {c.submitted ?? 0} submitted
                {c.avgScore != null && <> · avg score {c.avgScore}/100</>}
                {c.highRisk > 0 && <span style={{ color: "var(--danger)" }}> · {c.highRisk} flagged high risk</span>}
              </div>
              <div style={{ marginTop: 10, maxWidth: 320 }}>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={(ev) => {
                  ev.stopPropagation();
                  navigate(`/recruiter/exam/${e.id}`);
                }}
              >
                View candidates
              </button>
              <button
                className="btn btn-danger"
                style={{ backgroundColor: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  handleDelete(e.id, e.title);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {loaded && exams.length === 0 && <div className="empty-state">No assessments created yet.</div>}
    </div>
  );
}