/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

/** 0–1 similarity (1 = identical). */
export function stringSimilarity(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  const maxLen = Math.max(x.length, y.length);
  return 1 - levenshtein(x, y) / maxLen;
}

/** Best similarity of query against any candidate string or word. */
export function fuzzyMatchScore(query: string, candidates: string[]): number {
  const q = query.toLowerCase().trim();
  const compactQ = q.replace(/\s+/g, "");
  if (!compactQ) return 0;

  let best = 0;
  for (const raw of candidates) {
    if (!raw) continue;
    const text = raw.toLowerCase();
    const compact = text.replace(/\s+/g, "");

    best = Math.max(best, stringSimilarity(compactQ, compact));
    best = Math.max(best, stringSimilarity(q, text));

    for (const word of text.split(/[\s\-_/]+/)) {
      if (word.length < 2) continue;
      const maxLen = Math.max(compactQ.length, word.length);
      if (maxLen > 0) {
        best = Math.max(best, 1 - levenshtein(compactQ, word) / maxLen);
      }
      for (const token of q.split(/\s+/)) {
        if (token.length < 2) continue;
        const td = levenshtein(token, word);
        const tl = Math.max(token.length, word.length);
        if (tl > 0 && td <= 2) {
          best = Math.max(best, 1 - td / tl);
        }
      }
    }
  }

  return best;
}
