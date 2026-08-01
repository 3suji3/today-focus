import type { Category, Classification } from "./classification";

export function makeTaskReason(
  category: Category,
  minutes: number,
  energy: string,
  source: Classification["source"] = "personal",
) {
  if (category === "기타") {
    return source === "fallback"
      ? "분류가 애매해 기타에 뒀어. 수정하면 다음엔 더 잘 맞출게"
      : "이 일은 다른 분류보다 기타에 두는 게 가장 자연스러워";
  }
  if (energy === "낮음" && minutes <= 25) return "지금 체력에도 부담 없이 끝낼 수 있는 짧은 일이야";
  if (category === "취업") return "기회를 놓치지 않도록 취업 준비를 먼저 이어가면 좋아";
  if (category === "공부") return "짧게라도 이어가면 학습 흐름을 지킬 수 있어";
  if (category === "일상") return "생활 리듬을 가볍게 정돈하면 다음 일도 편해져";
  return "범위를 작게 나눠 오늘 안에 진전을 남길 수 있어";
}
