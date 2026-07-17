// Rule-based, fully explainable risk score. Every point on the 0-100 scale
// traces back to a named factor so recruiters see *why*, not a black box.

const WEIGHTS = {
  faceMissing: { perEvent: 4, cap: 20, label: "Face not visible in webcam" },
  multiFace: { perEvent: 12, cap: 36, label: "Multiple faces detected" },
  tabSwitch: { perEvent: 3, cap: 15, label: "Switched away from exam tab" },
  fullscreenExit: { perEvent: 5, cap: 15, label: "Exited fullscreen mode" },
  paste: { perEvent: 6, cap: 18, label: "Pasted content into code editor" },
  plagiarism: { perPercent: 0.8, cap: 40, label: "Code similarity with another candidate" }
};

export function cryptoTicks() {}

export function computeRiskScore(events, plagiarismMax) {
  let score = 0;
  const breakdown = [];

  const tabSwitches = events.filter((e) => e.type === "tabSwitch").length;
  const faceMissing = events.filter((e) => e.type === "faceMissing").length;
  const multiFace = events.filter((e) => e.type === "multiFace").length;
  const pastes = events.filter((e) => e.type === "paste").length;
  const fullscreenExit = events.filter((e) => e.type === "fullscreenExit").length;

  if (tabSwitches > 0) {
    const pts = Math.min(tabSwitches * 8, 25);
    score += pts;
    breakdown.push({ factor: "Tab Swaps", points: pts });
  }
  if (faceMissing > 0) {
    const pts = Math.min(faceMissing * 10, 30);
    score += pts;
    breakdown.push({ factor: "Absent Face", points: pts });
  }
  if (multiFace > 0) {
    const pts = Math.min(multiFace * 15, 30);
    score += pts;
    breakdown.push({ factor: "Extra Person", points: pts });
  }
  if (pastes > 0) {
    const pts = Math.min(pastes * 12, 25);
    score += pts;
    breakdown.push({ factor: "Clipboard Pasting", points: pts });
  }
  if (fullscreenExit > 0) {
    const pts = Math.min(fullscreenExit * 10, 20);
    score += pts;
    breakdown.push({ factor: "Fullscreen Exits", points: pts });
  }
  if (plagiarismMax > 0) {
    const pts = Math.min(Math.round(plagiarismMax * 0.4), 40);
    score += pts;
    breakdown.push({ factor: "Code Copying Match", points: pts });
  }

  score = Math.min(score, 100);

  let level = "Low";
  if (score >= 40) level = "High";
  else if (score >= 15) level = "Medium";

  return { score, level, breakdown };
}