import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const AVATAR_COLORS = ["#e07a5f", "#3f6c5e", "#45645e", "#0f172a", "#84a59d", "#a4664f"];

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [role, setRole] = useState("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  // Updated Mock demo array that matches seeded DB credentials exactly
  const demoAccounts = [
    { name: "Demo Recruiter", email: "admin@demo.com", password: "recruiter123", role: "recruiter" },
    { name: "Aditi Sharma", email: "aditi@demo.com", password: "candidate123", role: "candidate" },
    { name: "Rohan Verma", email: "rohan@demo.com", password: "candidate123", role: "candidate" }
  ];

  useEffect(() => {
    api.users().then(setUsers).catch(() => {});
  }, []);

  const handleDemoClick = (account) => {
    // Fill in BOTH credentials fully to pass validation on submit
    setEmail(account.email);
    setPassword(account.password);
    setRole(account.role);
    setMode("login");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill out both email and password.");
      return;
    }
    setError("");
    setLoading(email);
    try {
      const user = await api.login(email.trim(), password);
      onLogin(user);
      navigate(user.role === "recruiter" ? "/recruiter" : "/exams", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required to register.");
      return;
    }
    setError("");
    setLoading(email);
    try {
      const user = await api.signup(name.trim(), email.trim(), password, role);
      onLogin(user);
      navigate(user.role === "recruiter" ? "/recruiter" : "/exams", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="login-shell">
      {/* Left: brand / hero panel */}
      <div className="login-brand-panel">
        <div className="login-brand-top">
          <div className="badge">PI</div>
          ProctorIQ
        </div>

        <div className="login-brand-mid">
          <h1>
            Assess talent at scale.
            <br />
            <span>Trust every result.</span>
          </h1>
          <p>
            Coding rounds, aptitude tests, and MCQ certifications — proctored with multimodal AI,
            scored with explainable risk breakdowns, and backed by cross-candidate plagiarism detection.
          </p>
          <div className="login-feature-list">
            <div className="login-feature">
              <span className="dot-icon" /> Live webcam &amp; tab-switch proctoring
            </div>
            <div className="login-feature">
              <span className="dot-icon" /> Auto-evaluated coding, MCQ &amp; aptitude sections
            </div>
            <div className="login-feature">
              <span className="dot-icon" /> Explainable integrity risk scoring per candidate
            </div>
            <div className="login-feature">
              <span className="dot-icon" /> Cross-candidate plagiarism detection
            </div>
          </div>
        </div>

        <div className="login-brand-bottom">
          <span>Privacy</span>
          <span>Security</span>
          <span>Compliance</span>
        </div>
      </div>

      {/* Right: sign-in/sign-up form */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <div className="badge">PI</div>
            ProctorIQ
          </div>

          <h2 style={{ marginBottom: 4 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 6, marginBottom: 22 }}>
            {mode === "login"
              ? "Sign in with your credentials or select a demo account below."
              : "Register below to gain access to the secure sandbox ecosystem."}
          </p>

          <div className="role-toggle" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={{ display: "grid", gap: 14 }}>
            {mode === "signup" && (
              <>
                <div>
                  <label className="field-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Aditi Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Account Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="candidate">Candidate</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="field-label">Business email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="link-btn"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading !== null} style={{ width: "100%" }}>
              {loading ? "Processing…" : mode === "login" ? "Sign In" : "Register & Start"}
            </button>
          </form>

          {error && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12, textAlign: "center" }}>
              {error}
            </div>
          )}

          <div className="login-divider">Or use a demo account</div>

          <div className="user-list">
            {demoAccounts.map((account) => (
              <div
                key={account.email}
                className="user-chip"
                style={{ cursor: "pointer" }}
                onClick={() => handleDemoClick(account)}
              >
                <div className="avatar" style={{ background: colorFor(account.email) }}>
                  {initials(account.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{account.name}</div>
                  <div className="muted mono" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {account.email} · pwd: <strong>{account.password}</strong>
                  </div>
                </div>
                <span className="pill" style={{ textTransform: "capitalize" }}>
                  {account.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}