import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api.js";

const EVENT_LABELS = {
  tabSwitch: "Tab switch",
  faceMissing: "Face not visible",
  multiFace: "Multiple faces",
  paste: "Paste into editor",
  fullscreenExit: "Exited fullscreen",
  cameraDenied: "Camera access denied"
};

function fmtTime(ts, startedAt) {
  const secs = Math.round((ts - startedAt) / 1000);
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function CandidateReport() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.report(attemptId).then(setData);
  }, [attemptId]);

  if (!data) return <div className="container muted">Loading report…</div>;
  const { attempt, exam, user, timeline } = data;

  const chartData = attempt.risk.breakdown.map((b) => ({ name: b.factor, points: b.points }));

  return (
    <div className="container">
      <Link to={`/recruiter/exam/${exam.id}`} className="link-btn">
        ← Back to candidates
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "12px 0 20px", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>{user.name}</h2>
          <div className="muted mono" style={{ fontSize: 12.5, marginTop: 4 }}>
            {user.email} · {exam.title}
          </div>
        </div>
        <span className={`risk-badge risk-${attempt.risk.level}`} style={{ fontSize: 14, padding: "6px 14px" }}>
          {attempt.risk.level} risk · {attempt.risk.score}/100
        </span>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-label">Overall score</div>
          <div style={{ fontSize: 30, fontFamily: "var(--font-mono)" }}>{attempt.score.overall}/100</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
            MCQ: {attempt.score.mcqCorrect}/{attempt.score.mcqTotal} · Coding tests: {attempt.score.codingPassed}/{attempt.score.codingTotalTests}
          </div>
        </div>
        <div className="card">
          <div className="section-label">Time</div>
          <div style={{ fontSize: 15 }}>
            Started {new Date(attempt.startedAt).toLocaleTimeString()}
            <br />
            Submitted {new Date(attempt.submittedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Why this risk score — explainable breakdown</div>
        {chartData.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5 }}>No integrity signals were triggered during this attempt.</p>
        ) : (
          <div style={{ width: "100%", height: 46 * chartData.length + 20 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="#e6e3d0" horizontal={false} />
                <XAxis type="number" stroke="#76777d" fontSize={11} domain={[0, 40]} />
                <YAxis type="category" dataKey="name" stroke="#76777d" fontSize={12} width={190} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #c6c6cd", fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#e07a5f" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {attempt.plagiarism.matches.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ color: "var(--danger)" }}>
            Plagiarism matches
          </div>
          {attempt.plagiarism.matches.map((m, i) => (
            <div className="test-row" key={i}>
              <span className="dot fail" />
              {m.similarity}% code similarity with <strong style={{ margin: "0 4px" }}>{m.withUserName}</strong> on question {m.qid}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="section-label">Proctoring timeline</div>
        {timeline.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>No flagged events during this attempt.</p>}
        {timeline.map((e) => (
          <div className="test-row" key={e.id}>
            <span className="dot fail" />
            <span className="mono">{fmtTime(e.ts, attempt.startedAt)}</span>
            <span>{EVENT_LABELS[e.type] || e.type}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-label">Code submissions</div>
        {exam.questions
          .filter((q) => q.type === "coding")
          .map((q) => {
            const sub = attempt.codingSubmissions[q.id];
            return (
              <div key={q.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                  <strong>{q.title}</strong>
                  <span className="muted mono">
                    {sub ? `${sub.passedCount}/${sub.total} tests · ${sub.language}` : "not attempted"}
                  </span>
                </div>
                {sub && (
                  <pre
                    className="mono"
                    style={{
                      background: "var(--code-bg)",
                      border: "1px solid var(--code-border)",
                      borderRadius: 8,
                      color: "var(--code-text)",
                      padding: 12,
                      fontSize: 12.5,
                      overflowX: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {sub.code}
                  </pre>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
