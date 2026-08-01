export function koreanVocative(rawName: string) {
  const name = rawName.trim() || "친구";
  const lastCharacter = name.at(-1) ?? "";
  const code = lastCharacter.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (code - 0xac00) % 28 !== 0;

  return `${name}${hasFinalConsonant ? "아" : "야"}`;
}
