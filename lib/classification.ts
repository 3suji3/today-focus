export const categories = ["취업", "공부", "프로젝트", "일상", "기타"] as const;
export type Category = (typeof categories)[number];

export type CategoryFeedback = {
  title: string;
  category: Category;
};

export type Classification = {
  category: Category;
  confidence: number;
  source: "personal" | "rules" | "fallback";
};

const keywordGroups: Record<Category, string[]> = {
  취업: [
    "지원", "채용", "면접", "이력서", "자소서", "포트폴리오", "공고", "회사",
    "직무", "커리어", "취업", "코딩테스트", "과제전형", "링크드인",
  ],
  공부: [
    "공부", "책", "독서", "읽기", "강의", "수업", "복습", "예습", "시험",
    "문제", "단어", "암기", "자격증", "playwright", "튜토리얼", "논문", "학습",
  ],
  프로젝트: [
    "프로젝트", "개발", "구현", "코딩", "디자인", "기획", "배포", "테스트", "버그",
    "리팩터링", "readme", "github", "깃허브", "회의", "문서화", "릴리즈", "데이터베이스",
  ],
  일상: [
    "청소", "설거지", "빨래", "장보기", "마트", "산책", "운동", "병원", "약",
    "요리", "식사", "샤워", "정리", "예약", "택배", "은행", "연락", "전화", "쓰레기",
  ],
  기타: [
    "모임", "약속", "생일", "선물", "여행", "공연", "전시", "영화", "게임",
    "취미", "봉사", "동호회",
  ],
};

export function normalizeTitle(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyTask(title: string, feedback: CategoryFeedback[] = []): Classification {
  const normalized = normalizeTitle(title);
  if (!normalized) return { category: "기타", confidence: 0, source: "fallback" };

  const exact = feedback.find((item) => normalizeTitle(item.title) === normalized);
  if (exact) return { category: exact.category, confidence: 0.99, source: "personal" };

  const scores = new Map<Category, number>(categories.map((category) => [category, 0]));
  let hasPersonalMatch = false;
  for (const [category, keywords] of Object.entries(keywordGroups) as [Category, string[]][]) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) scores.set(category, (scores.get(category) ?? 0) + (keyword.length >= 3 ? 3 : 2));
    }
  }

  const tokens = new Set(normalized.split(" ").filter((token) => token.length >= 2));
  for (const item of feedback.slice(0, 200)) {
    const learnedTokens = new Set(normalizeTitle(item.title).split(" ").filter((token) => token.length >= 2));
    const overlap = [...tokens].filter((token) => learnedTokens.has(token)).length;
    if (overlap) {
      hasPersonalMatch = true;
      scores.set(item.category, (scores.get(item.category) ?? 0) + overlap * 2.5);
    }
  }

  if (/\b(만들기|제작|완성|수정|작성)\b/.test(normalized)) scores.set("프로젝트", (scores.get("프로젝트") ?? 0) + 1);
  if (/\b(보기|읽기|외우기|풀기|듣기)\b/.test(normalized)) scores.set("공부", (scores.get("공부") ?? 0) + 1);

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || best[1] < 1.5) return { category: "기타", confidence: 0.35, source: "fallback" };

  const margin = best[1] - (second?.[1] ?? 0);
  const confidence = Math.min(0.97, 0.58 + best[1] * 0.045 + margin * 0.035);
  return { category: best[0], confidence: Math.round(confidence * 100) / 100, source: hasPersonalMatch ? "personal" : "rules" };
}
