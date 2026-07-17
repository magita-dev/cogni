import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Signup({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { user, token } = await api.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role
      });
      onLogin({ user, token });
      navigate(user.role === "recruiter" ? "/recruiter" : "/exams");
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      if (e.fields) setFieldErrors((prev) => ({ ...prev, ...e.fields }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      {/* Left: brand / hero panel */}
      <div className="login-brand-panel">
        <div className="login-brand-top">
          <div className="badge" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold))" }}>
            PI
          </div>
          ProctorIQ
        </div>

        <div className="login-brand-mid">
          <h1>
            Create your
            <br />
            <span>ProctorIQ account.</span>
          </h1>
          <p>
            Set up a candidate or recruiter account to run proctored assessments, review
            explainable risk scores, and catch plagiarism across candidates.
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

      {/* Right: sign-up form */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <div className="badge">PI</div>
            ProctorIQ
          </div>

          <h2 style={{ marginBottom: 4 }}>Create your account</h2>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 6, marginBottom: 22 }}>
            It only takes a minute to get started.
          </p>

          <div className="role-toggle">
            <button type="button" className={role === "candidate" ? "active" : ""} onClick={() => setRole("candidate")}>
              Candidate
            </button>
            <button type="button" className={role === "recruiter" ? "active" : ""} onClick={() => setRole("recruiter")}>
              Recruiter
            </button>
          </div>

          <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="field-label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={fieldErrors.name ? { borderColor: "var(--danger)" } : undefined}
              />
              {fieldErrors.name && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={fieldErrors.email ? { borderColor: "var(--danger)" } : undefined}
              />
              {fieldErrors.email && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: 40, ...(fieldErrors.password ? { borderColor: "var(--danger)" } : {}) }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="link-btn"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "hide" : "show"}
                </button>
              </div>
              {fieldErrors.password && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                style={fieldErrors.confirmPassword ? { borderColor: "var(--danger)" } : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Creating account…" : `Create ${role} account`}
            </button>
          </form>

          {error && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          <p className="muted" style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
