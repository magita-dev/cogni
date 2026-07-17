import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ExamList from "./pages/ExamList.jsx";
import CandidateExam from "./pages/CandidateExam.jsx";
import ExamResult from "./pages/ExamResult.jsx";
import RecruiterDashboard from "./pages/RecruiterDashboard.jsx";
import ExamAttempts from "./pages/ExamAttempts.jsx";
import CandidateReport from "./pages/CandidateReport.jsx";
import CreateTest from "./pages/CreateTest.jsx";
import AnalyticsDashboard from "./pages/AnalyticsDashboard.jsx";

const RECRUITER_LINKS = [
  { label: "Assessments", path: "/recruiter" },
  { label: "Analytics", path: "/recruiter/analytics" },
  { label: "+ Create Test", path: "/recruiter/create" }
];

function Topbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const go = (path) => navigate(path);

  // Requirement: Do not let users log out during an active exam
  const isExamActive = location.pathname.startsWith("/attempt/");

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div
            className="brand"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (isExamActive) return;
              go(user?.role === "recruiter" ? "/recruiter" : "/exams");
            }}
          >
            <div className="badge">PI</div>
            ProctorIQ
          </div>
          {user?.role === "recruiter" && (
            <nav className="topbar-nav">
              {RECRUITER_LINKS.map((l) => (
                <button key={l.path} className="btn" onClick={() => go(l.path)}>
                  {l.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        {user && (
          <div className="topbar-actions">
            <span className="pill">
              {user.role === "recruiter" ? "Recruiter" : "Candidate"} · {user.name}
            </span>
            {!isExamActive && (
              <button className="btn" onClick={handleLogout}>
                Log out
              </button>
            )}
            {isExamActive && (
              <span className="pill" style={{ color: "var(--danger)" }}>
                Exam Session Locked
              </span>
            )}
            {user.role === "recruiter" && (
              <button
                className="menu-toggle"
                aria-label="Toggle navigation menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {user?.role === "recruiter" && (
        <div className={`mobile-nav ${menuOpen ? "open" : ""}`}>
          {RECRUITER_LINKS.map((l) => (
            <button key={l.path} className="btn" onClick={() => go(l.path)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("piq_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("piq_user", JSON.stringify(user));
    else localStorage.removeItem("piq_user");
  }, [user]);

  const logout = () => setUser(null);

  // Requirement: Using `replace` parameter on Navigate to clear redundant login history loops
  return (
    <div className="app-shell">
      <Topbar user={user} onLogout={logout} />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === "recruiter" ? "/recruiter" : "/exams"} replace /> : <Login onLogin={setUser} />}
        />

        <Route path="/exams" element={user ? <ExamList user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/attempt/:attemptId" element={user ? <CandidateExam user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/result/:attemptId" element={user ? <ExamResult user={user} /> : <Navigate to="/login" replace />} />

        <Route path="/recruiter" element={user?.role === "recruiter" ? <RecruiterDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/recruiter/create" element={user?.role === "recruiter" ? <CreateTest /> : <Navigate to="/login" replace />} />
        <Route path="/recruiter/analytics" element={user?.role === "recruiter" ? <AnalyticsDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/recruiter/exam/:examId" element={user?.role === "recruiter" ? <ExamAttempts /> : <Navigate to="/login" replace />} />
        <Route path="/recruiter/report/:attemptId" element={user?.role === "recruiter" ? <CandidateReport /> : <Navigate to="/login" replace />} />

        <Route
          path="*"
          element={<Navigate to={user ? (user.role === "recruiter" ? "/recruiter" : "/exams") : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}