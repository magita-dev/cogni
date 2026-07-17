import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { api } from "../api.js";

const RISK_COLORS = { Low: "#3f6c5e", Medium: "#e07a5f", High: "#ba1a1a" };
const SCORE_BUCKETS = ["0-20", "21-40", "41-60", "61-80", "81-100"];

function bucketFor(score) {
  if (score <= 20) return 0;
  if (score <= 40) return 1;
  if (score <= 60) return 2;
  if (score <= 80) return 3;
  return 4;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [allAttempts, setAllAttempts] = useState([]);
  const [examTitles, setExamTitles] = useState({});
  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    attemptedCount: 0,
    notAttemptedCount: 0,
    attemptedCandidates: [],
    notAttemptedCandidates: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    api.exams().then(async (exams) => {
      const titles = {};
      let combined = [];
      for (const e of exams) {
        titles[e.id] = e.title;
        const attempts = await api.examAttempts(e.id);
        combined = combined.concat(attempts);
      }
      setExamTitles(titles);
      setAllAttempts(combined);

      // Fetch attempted/not-attempted students
      const stats = await api.recruiterAnalytics();
      setStudentStats(stats);

      setLoading(false);
    });
  }, []);

  if (loading) return <div className="container muted">Loading analytics…</div>;

  const submitted = allAttempts.filter((a) => a.status === "submitted");
  const inProgress = allAttempts.length - submitted.length;

  const avgScore = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + (a.score?.overall || 0), 0) / submitted.length)
    : 0;

  const scoreDist = SCORE_BUCKETS.map((label) => ({ label, count: 0 }));
  submitted.forEach((a) => scoreDist[bucketFor(a.score?.overall || 0)].count++);

  const riskDist = ["Low", "Medium", "High"].map((level) => ({
    name: level,
    value: submitted.filter((a) => a.risk?.level === level).length
  })).filter((r) => r.value > 0);

  const flaggedTotal = submitted.filter((a) => a.risk?.level === "High").length;
  const plagiarismTotal = submitted.filter((a) => (a.plagiarism?.maxSimilarity || 0) >= 40).length;

  return (
    <div className="container">
      <div className="section-label">Recruiter console</div>
      <h2 style={{ marginBottom: 18 }}>Analytics</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{studentStats.totalStudents}</div>
          <div className="stat-label">Total registered students</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--safe)" }}>
          <div className="stat-value">{studentStats.attemptedCount}</div>
          <div className="stat-label">Attempted at least once</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--gold)" }}>
          <div className="stat-value">{studentStats.notAttemptedCount}</div>
          <div className="stat-label">Have not attempted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: flaggedTotal > 0 ? "var(--danger)" : "var(--text)" }}>
            {flaggedTotal}
          </div>
          <div className="stat-label">High risk attempts</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-label">Attempted Candidates ({studentStats.attemptedCount})</div>
          <div className="user-list" style={{ maxHeight: 200 }}>
            {studentStats.attemptedCandidates.map((c) => (
              <div key={c.id} className="user-chip" style={{ margin: "4px 0" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{c.email}</div>
                </div>
              </div>
            ))}
            {studentStats.attemptedCandidates.length === 0 && <p className="muted">No candidates have started yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-label">Unattempted Candidates ({studentStats.notAttemptedCount})</div>
          <div className="user-list" style={{ maxHeight: 200 }}>
            {studentStats.notAttemptedCandidates.map((c) => (
              <div key={c.id} className="user-chip" style={{ margin: "4px 0" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{c.email}</div>
                </div>
              </div>
            ))}
            {studentStats.notAttemptedCandidates.length === 0 && <p className="muted">All candidates have attempted.</p>}
          </div>
        </div>
      </div>

      {submitted.length === 0 ? (
        <div className="empty-state">No submitted attempts yet — detailed graphs will populate once exams are finished.</div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="section-label">Score distribution</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={scoreDist} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid stroke="#e6e3d0" vertical={false} />
                  <XAxis dataKey="label" stroke="#76777d" fontSize={11.5} />
                  <YAxis stroke="#76777d" fontSize={11.5} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #c6c6cd", fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDist.map((_, i) => (
                      <Cell key={i} fill="#e07a5f" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="section-label">Integrity risk breakdown</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={3}>
                    {riskDist.map((r, i) => (
                      <Cell key={i} fill={RISK_COLORS[r.name]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12.5 }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #c6c6cd", fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}