const koreanCounterPattern = /(\d+)(개(?:은|는|이|가|을|를|도|만|부터|까지|씩)?)/g;

// U+2060 WORD JOINER is invisible but prevents a line break between a number
// and its Korean counter/particle, such as "4개도".
export function protectKoreanCounters(text: string) {
  return text.replace(koreanCounterPattern, "$1\u2060$2");
}

export function shouldJoinHeroGreeting(greeting: string, firstPhrase: string, maxCharacters = 16) {
  return Array.from(`${greeting.trim()}, ${firstPhrase.trim()}`).length <= maxCharacters;
}
