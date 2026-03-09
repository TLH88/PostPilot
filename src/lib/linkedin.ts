export function openLinkedInShare(content: string, hashtags: string[]) {
  const fullText =
    content +
    (hashtags.length > 0
      ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ")
      : "");
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(fullText)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
