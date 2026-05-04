// Compact line-based diff for showing the AI what the user changed in the
// editor between chat turns. LCS-based; output is a unified-style patch with
// "- " for removals and "+ " for additions, unchanged lines elided.
//
// Designed for short LinkedIn drafts (<3000 chars). For pathological inputs
// the diff is truncated so we never blow up the prompt.

const MAX_DIFF_CHARS = 4000;

export function diffEdits(oldText: string, newText: string): string {
  if (oldText === newText) return "";

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`- ${oldLines[i]}`);
      i++;
    } else {
      out.push(`+ ${newLines[j]}`);
      j++;
    }
  }
  while (i < m) {
    out.push(`- ${oldLines[i]}`);
    i++;
  }
  while (j < n) {
    out.push(`+ ${newLines[j]}`);
    j++;
  }

  const joined = out.join("\n");
  if (joined.length <= MAX_DIFF_CHARS) return joined;
  return `${joined.slice(0, MAX_DIFF_CHARS)}\n… (diff truncated)`;
}
