const BASE = "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network anomaly" }));
    throw new Error(err.error || "An unexpected error occurred.");
  }
  return res.json();
}

export const api = {
  login: (email, password) => request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (name, email, password, role) => request("/signup", { method: "POST", body: JSON.stringify({ name, email, password, role }) }),
  users: () => request("/users"),
  exams: () => request("/exams"),
  exam: (id, role) => request(`/exams/${id}${role ? `?role=${role}` : ""}`),
  createExam: (data) => request("/exams", { method: "POST", body: JSON.stringify(data) }),
  deleteExam: (id) => request(`/exams/${id}`, { method: "DELETE" }),
  startAttempt: (examId, userId) => request("/attempts", { method: "POST", body: JSON.stringify({ examId, userId }) }),
  attempt: (id) => request(`/attempts/${id}`),
  examAttempts: (examId) => request(`/exams/${examId}/attempts`),
  recruiterAnalytics: () => request("/recruiter/analytics/students"),
  answerMcq: (attemptId, qid, correctIndex) => request(`/attempts/${attemptId}/mcq`, { method: "POST", body: JSON.stringify({ qid, correctIndex }) }),
  runCode: (attemptId, qid, code, language) => request(`/attempts/${attemptId}/run`, { method: "POST", body: JSON.stringify({ qid, code, language }) }),
  submitCode: (attemptId, qid, code, language) => request(`/attempts/${attemptId}/submit-code`, { method: "POST", body: JSON.stringify({ qid, code, language }) }),
  proctorEvent: (attemptId, type, detail) => request(`/attempts/${attemptId}/event`, { method: "POST", body: JSON.stringify({ type, detail }) }),
  finish: (attemptId) => request(`/attempts/${attemptId}/finish`, { method: "POST" }),
  report: (attemptId) => request(`/reports/${attemptId}`)
};