# ProctorIQ — AI-Powered Secure Assessment & Integrity Platform

Built for **PS-003: AI-Powered Secure Assessment & Integrity Platform** (EdTech track).

A working prototype of an end-to-end assessment lifecycle: question delivery, in-browser
AI proctoring, a sandboxed code judge, plagiarism detection, and **explainable** risk
scoring for recruiters — not just a score, but a breakdown of *how* the system got there.

## Design system

The UI runs on the **"Professional Integrity"** design language (Plus Jakarta Sans, warm
cream surfaces, deep navy text, a terracotta call-to-action accent, and a sage secondary
tone). Every page shares one set of CSS variables and component classes in
`client/src/styles.css`, so the palette, spacing, and shape language stay consistent from
the sign-in screen through the recruiter analytics dashboards. The layout is responsive
throughout — the top navigation collapses to a hamburger menu, stat grids and two-column
panels stack on narrow screens, and data tables scroll horizontally instead of overflowing.

## Quick start (runs entirely on your laptop, no cloud services needed)

Requires: **Node.js 18+** and **Python 3** (used only to execute candidates' Python
submissions — the app itself is all Node/React).

```bash
npm run install:all   # installs server + client dependencies
npm run dev            # starts API on :4000 and the app on :5173
```

Open **http://localhost:5173**. Sign in with email + password (both are required and
verified against a bcrypt hash), or create a brand-new account from the **Sign Up** link.
The login page also lists the seeded demo credentials:

| Account | Email | Password | Role |
|---|---|---|---|
| Candidate 1 | student@example.com | student123 | Candidate |
| Candidate 2 | student2@example.com | student123 | Candidate |
| Recruiter | recruiter@example.com | recruiter123 | Recruiter |

Log in as a candidate to take the sample exam. Log in as the recruiter to see the
dashboard, per-candidate risk reports, and plagiarism matches (try submitting near-identical
code for two different candidates on the same exam — the similarity engine will flag it).

## What's implemented

**1. Assessment lifecycle**
MCQ + coding questions, timed attempts, question navigation, autosave of answers as you go.

**2. Secure code judge**
Server-side sandboxed execution (Python & JavaScript) against visible sample tests *and*
hidden tests revealed only at submission — like a real online judge, not a toy checker.
`server/lib/codeRunner.js`


**3. Multimodal AI proctoring**
Runs entirely in the candidate's browser via `face-api.js` (TinyFaceDetector):
- Live webcam feed with face-presence detection
- Multiple-face detection (flags a possible second person)
- Tab-switch / window-blur detection
- Fullscreen-exit detection
- Copy-paste-into-editor detection

Every event is timestamped and logged to the backend as it happens — nothing is
inferred after the fact. `client/src/components/ProctorWebcam.jsx`

**4. Plagiarism detection**
A MOSS-style k-gram winnowing fingerprint algorithm compares each candidate's code
against every other candidate's submission for the same question and reports a
similarity percentage plus who matched whom. `server/lib/plagiarism.js`

**5. Explainable risk scoring**
A transparent, rule-based scorer — every point on the 0–100 scale traces back to a
named, weighted factor (face missing, multiple faces, tab switches, paste events,
plagiarism %) shown as a bar chart in the recruiter report. No black box.
`server/lib/riskEngine.js`

**6. Recruiter analytics**
Dashboard of all attempts per exam, sortable by score, with a one-click drill-down
into each candidate's full report: score breakdown, proctoring timeline, plagiarism
matches, and their actual submitted code.

## Architecture

```
secure-assess/
├── server/              Express API + JSON file datastore (lowdb — zero setup, no DB install)
│   ├── index.js         All REST routes
│   ├── lib/
│   │   ├── codeRunner.js    sandboxed Python/JS execution + test grading
│   │   ├── plagiarism.js    winnowing fingerprint similarity
│   │   └── riskEngine.js    explainable weighted risk scoring
│   └── db.js             seed data: 1 exam, 2 MCQs, 2 coding questions
└── client/              React (Vite) — candidate exam UI + recruiter dashboard
    ├── src/pages/         Login, ExamList, CandidateExam, ExamResult,
    │                      RecruiterDashboard, ExamAttempts, CandidateReport
    └── src/components/    ProctorWebcam (face-api.js integration)
```

No external services, API keys, or paid infrastructure required — everything (including
the "AI" proctoring model) runs locally, which also means **candidate video never leaves
their browser**.
