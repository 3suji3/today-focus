export const GROWTH_COLLECTION_MAX = 15000;
export const LUCKY_STONE_COUNTS = [7, 77, 777, 7777] as const;

export type StoneEasterEgg = {
  kind: "lucky" | "milestone" | "legendary" | "mirror" | "special" | "sequence";
  title: string;
  message: string;
};

export function getStoneEasterEgg(total: number): StoneEasterEgg | null {
  if (total >= GROWTH_COLLECTION_MAX) {
    return {
      kind: "legendary",
      title: "돌친구 왕국 수호곰",
      message: "모든 성장 컬렉션을 모아 특별곰이 영구 해금됐어!",
    };
  }
  if (LUCKY_STONE_COUNTS.some((count) => count === total)) {
    return {
      kind: "lucky",
      title: "행운의 일곱 돌",
      message: `${total.toLocaleString("ko-KR")}개의 성취가 만든 행운의 반짝임을 찾았어!`,
    };
  }
  const specialCounts: Record<number, Omit<StoneEasterEgg, "kind"> & { kind?: StoneEasterEgg["kind"] }> = {
    42: { title: "우주의 정답돌", message: "삶과 우주와 돌친구의 비밀 숫자를 찾았어!" },
    100: { title: "백일 돌잔치", message: "돌친구들이 누적 성취 백일상을 차렸어!" },
    314: { title: "동그란 파이돌", message: "3.14처럼 끝없이 둥근 비밀을 찾았어!" },
    365: { title: "한 바퀴의 돌", message: "하루씩 모아 한 해를 닮은 숫자에 도착했어!" },
    404: { title: "길 잃은 돌", message: "찾을 수 없음… 대신 숨은 돌친구를 찾았어!" },
    423: { title: "봄날의 돌", message: "4월 23일처럼 포근한 봄빛이 피어났어!" },
    1004: { title: "천사 돌친구", message: "천사 숫자 1004에서 날개 달린 돌을 만났어!" },
    1234: { kind: "sequence", title: "차곡차곡 돌계단", message: "1·2·3·4, 성취가 계단처럼 차곡차곡!" },
    4321: { kind: "sequence", title: "되감기 돌계단", message: "4·3·2·1, 비밀 계단을 거꾸로 내려왔어!" },
    8888: { title: "무한 행운돌", message: "옆으로 누운 8이 네 번, 행운이 끝없이 이어져!" },
  };
  const special = specialCounts[total];
  if (special) return { kind: special.kind ?? "special", title: special.title, message: special.message };

  const digits = String(total);
  if (digits.length >= 3 && new Set(digits).size === 1) {
    return { kind: "mirror", title: "도플갱어 돌", message: `${digits.split("").join("·")} 똑같은 숫자가 줄지어 나타났어!` };
  }
  if (digits.length >= 3 && digits === [...digits].reverse().join("")) {
    return { kind: "mirror", title: "거울 속 돌", message: `${total.toLocaleString("ko-KR")}은 거꾸로 읽어도 똑같은 비밀 숫자야!` };
  }
  if (total > 0 && total % 1000 === 0) {
    return {
      kind: "milestone",
      title: "천 개의 발자국",
      message: `누적 성취 ${total.toLocaleString("ko-KR")}개 기념 배지가 나타났어!`,
    };
  }
  return null;
}
