const K_GRAM_SIZE = 50;
const WINDOW_SIZE = 4;

function cleanCode(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "") // Strip comments
    .replace(/\s+/g, ""); // Strip whitespace
}

function getFingerprints(code) {
  const text = cleanCode(code);
  if (text.length < K_GRAM_SIZE) {
    return new Set([text]);
  }

  const fingerprints = new Set();
  const hashes = [];

  for (let i = 0; i <= text.length - K_GRAM_SIZE; i++) {
    const gram = text.slice(i, i + K_GRAM_SIZE);
    let hash = 0;
    for (let j = 0; j < gram.length; j++) {
      hash = (hash * 31 + gram.charCodeAt(j)) % 1000000007;
    }
    hashes.push(hash);
  }

  for (let i = 0; i <= hashes.length - WINDOW_SIZE; i++) {
    const window = hashes.slice(i, i + WINDOW_SIZE);
    const minHash = Math.min(...window);
    fingerprints.add(minHash);
  }

  return fingerprints;
}

export function checkPlagiarism(submission, allSubmissions) {
  const targetFingerprints = getFingerprints(submission.code);
  if (targetFingerprints.size === 0) return { maxSimilarity: 0, matches: [] };

  const matches = [];
  let maxSimilarity = 0;

  for (const other of allSubmissions) {
    if (other.attemptId === submission.attemptId || other.qid !== submission.qid) {
      continue;
    }

    const otherFingerprints = getFingerprints(other.code);
    if (otherFingerprints.size === 0) continue;

    const intersection = new Set([...targetFingerprints].filter(h => otherFingerprints.has(h)));
    const similarity = Math.round(
      (2 * intersection.size) / (targetFingerprints.size + otherFingerprints.size) * 100
    );

    if (similarity > 15) { // Match threshold
      if (similarity > maxSimilarity) maxSimilarity = similarity;
      matches.push({
        qid: submission.qid,
        withAttemptId: other.attemptId,
        withUserName: other.userName,
        similarity
      });
    }
  }

  return { maxSimilarity, matches };
}