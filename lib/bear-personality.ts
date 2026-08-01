export const bearPersonalities = ["warm", "cool", "driven", "lively"] as const;

export type BearPersonality = (typeof bearPersonalities)[number];

export const bearPersonalityOptions: Array<{
  value: BearPersonality;
  label: string;
  icon: string;
  description: string;
  sample: string;
}> = [
  {
    value: "warm",
    label: "다정",
    icon: "◡‿◡",
    description: "부담 없이 천천히 응원해",
    sample: "하나씩 해도 충분해. 같이 골라보자.",
  },
  {
    value: "cool",
    label: "냉정",
    icon: "•_•",
    description: "짧고 정확하게 핵심만 말해",
    sample: "지금 할 일부터 정리하자.",
  },
  {
    value: "driven",
    label: "적극",
    icon: "•̀ᴗ•́",
    description: "바로 움직일 수 있게 밀어줘",
    sample: "좋아, 첫 번째 일정부터 바로 시작하자!",
  },
  {
    value: "lively",
    label: "활발",
    icon: "⌃‿⌃",
    description: "리액션이 크고 신나게 북돋아줘",
    sample: "오늘도 할 일 사냥 출발! 신나게 가보자!",
  },
];

type HeroCopyInput = {
  personality: BearPersonality;
  activeTab: string;
  mood: "empty" | "complete" | "progress" | "ready";
  total: number;
  complete: number;
  remaining: number;
  filtered: number;
  recommended: number;
  variantKey?: string;
};

type EmptyCopy = {
  title: string;
  description: string;
  action: string;
};

export function isBearPersonality(value: unknown): value is BearPersonality {
  return typeof value === "string" && bearPersonalities.includes(value as BearPersonality);
}

function pickLine(lines: readonly string[], key: string) {
  const score = Array.from(key).reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0);
  return lines[score % lines.length];
}

export function getBearHeroLine(input: HeroCopyInput) {
  const { personality, activeTab, mood, total, complete, remaining, filtered, recommended, variantKey = "" } = input;
  const key = `${variantKey}-${activeTab}-${mood}-${total}-${complete}-${remaining}-${filtered}-${recommended}-${personality}`;
  if (activeTab === "기록") {
    return pickLine({
      warm: [
        "작은 성취들을 다시 만나보자", "차곡차곡 모은 오늘들을 함께 돌아볼까?", "네가 해낸 순간들이 여기 모여 있어",
        "기록 속에서 열심히 보낸 날들을 찾아보자", "완료한 일마다 작은 돌 하나가 반짝이고 있어",
        "천천히 넘겨보면 생각보다 많이 해냈을 거야", "오늘까지 이어진 발자국을 같이 살펴볼까?",
        "잘한 날도 쉬어 간 날도 모두 네 기록이야", "잊고 있던 성취를 다시 꺼내보자",
        "달력에 모인 네 하루들을 편하게 돌아보자",
      ],
      cool: [
        "지금까지의 완료 기록을 확인하자", "쌓인 기록을 한눈에 정리했어", "완료한 일정과 흐름을 확인해.",
        "날짜별 완료 현황을 점검하자.", "이번 달 기록을 기준으로 흐름을 보자.",
        "완료와 미완료를 날짜별로 분리했어.", "필요한 날짜를 골라 기록을 확인해.",
        "누적된 일정과 완료율을 검토하자.", "기록은 정리됐어. 날짜만 선택하면 돼.",
        "이번 달에 실제로 끝낸 일을 확인해.",
      ],
      driven: [
        "해낸 기록에서 다음 흐름을 만들자", "완료 기록을 보고 다음 목표를 잡자", "지금까지의 성취를 다음 행동으로 이어가자",
        "잘된 날의 흐름을 찾아서 다시 써먹자", "완료가 많았던 날부터 성공 패턴을 잡자",
        "기록을 확인하고 다음 목표를 더 선명하게 만들자", "쌓인 성취를 다음 도전의 출발점으로 삼자",
        "지난 결과를 보고 오늘의 우선순위를 정하자", "완료 기록에서 계속 이어갈 습관을 찾아보자",
        "지금까지 해낸 만큼 다음 단계도 바로 잡아보자",
      ],
      lively: [
        "모아둔 성취들을 신나게 구경해보자!", "우와, 해낸 일들이 이렇게 많이 모였어!", "반짝이는 완료 기록 구경하러 가자!",
        "달력 속 돌 친구들이 와글와글 기다리고 있어!", "완료한 날마다 돌 친구가 짠 하고 나타났어!",
        "이번 달 성취 탐험 출발! 어떤 날이 반짝일까?", "해낸 날들을 찾으러 달력 여행을 떠나자!",
        "돌 친구들이 모인 날짜를 콕콕 눌러보자!", "와, 네가 움직인 흔적이 달력에 가득해!",
        "오늘은 지난 성취 자랑 대회를 열어보자!",
      ],
    }[personality], key);
  }

  if (activeTab !== "오늘") {
    if (filtered === 0) return getEmptyTaskCopy(personality, activeTab).title;
    return pickLine({
      warm: [
        `${activeTab} 일정을 차근차근 볼게`, `${activeTab} 일정도 부담 없이 하나씩 보자`, `${activeTab}에서 먼저 할 일을 같이 골라볼까?`,
        `${activeTab}에 모인 일들을 편하게 살펴보자`, `${activeTab} 일정 중 지금 가능한 것부터 찾아볼게`,
        `${activeTab}도 네 속도에 맞춰 하나씩 가면 돼`, `${activeTab}에서 오늘 마음 가는 일부터 골라보자`,
        `${activeTab} 일정이 잘 보이게 모아뒀어`, `${activeTab}에서 작은 일 하나만 먼저 시작해볼까?`,
        `${activeTab} 목록을 같이 천천히 정리해보자`,
      ],
      cool: [
        `${activeTab} 일정만 모았어`, `${activeTab} 항목만 정리했어.`, `${activeTab} 일정부터 확인하자.`,
        `${activeTab} 항목을 기준으로 필터링했어.`, `${activeTab}에 남은 일정만 보면 돼.`,
        `${activeTab} 목록 확인 준비 완료.`, `${activeTab} 일정 수는 ${filtered}개야.`,
        `${activeTab}에서 처리할 항목을 고르자.`, `${activeTab} 일정만 순서대로 확인해.`,
        `${activeTab} 관련 작업을 한곳에 정리했어.`,
      ],
      driven: [
        `${activeTab} 일정부터 집중해서 끝내자`, `${activeTab}에서 가장 중요한 일부터 시작하자`, `${activeTab} 일정, 지금 하나 처리하자`,
        `${activeTab} 목표를 하나 골라 바로 움직이자`, `${activeTab}에서 우선순위 높은 것부터 끝내자`,
        `${activeTab} 일정 ${filtered}개, 첫 번째부터 밀어보자`, `${activeTab}에서 오늘의 핵심 하나를 잡자`,
        `${activeTab} 목록을 실행 순서대로 정리해보자`, `${activeTab} 일정에 집중할 시간! 바로 시작하자`,
        `${activeTab}에서 미뤄둔 일 하나를 지금 끝내자`,
      ],
      lively: [
        `${activeTab} 일정 모여라! 하나씩 가보자!`, `${activeTab} 할 일 발견! 뭐부터 시작할까?`, `${activeTab} 일정도 신나게 하나씩 깨보자!`,
        `${activeTab} 미션 ${filtered}개 등장! 출발!`, `${activeTab} 목록 탐험 시작! 첫 목표는 뭐야?`,
        `${activeTab} 할 일들이 줄 서서 기다리고 있어!`, `${activeTab} 일정 하나 잡고 신나게 달려보자!`,
        `${activeTab} 미션을 깨면 돌 친구가 더 신날 거야!`, `${activeTab} 일정 정복 작전, 지금 시작!`,
        `${activeTab}에서 오늘의 보너스 미션을 골라보자!`,
      ],
    }[personality], key);
  }

  if (mood === "empty") {
    return pickLine({
      warm: [
        "오늘 하고 싶은 일을 하나 골라볼까?", "비어 있는 오늘에 작은 일정 하나 놓아볼까?", "천천히 생각해도 괜찮아. 하나부터 시작하자.",
        "아무것도 없어도 괜찮아. 필요할 때 하나 적어보자", "오늘을 채울 작은 약속 하나만 만들어볼까?",
        "쉬는 날이라면 그대로 두어도 좋아", "생각나는 일이 생기면 내가 잘 받아 적어둘게",
        "부담 없는 일 하나부터 살짝 시작해보자", "오늘의 빈칸에 네가 원하는 일을 놓아보자",
        "서두르지 말고 지금 필요한 일을 천천히 찾아보자",
      ],
      cool: [
        "오늘 목록은 비어 있어. 하나만 정하면 돼.", "아직 일정 없음. 필요한 것 하나만 추가해.", "오늘 할 일은 없어. 생기면 바로 적으면 돼.",
        "등록된 오늘 일정이 없어.", "목록이 비어 있어. 추가하거나 쉬면 돼.",
        "현재 처리할 항목 없음.", "오늘 계획을 만들려면 일정 하나를 추가해.",
        "해야 할 일이 없다면 그대로 두면 돼.", "필요한 작업이 생길 때 기록해.",
        "오늘 일정 0개. 다음 행동을 직접 정해.",
      ],
      driven: [
        "첫 일정을 만들고 바로 시작하자.", "오늘의 첫 목표를 지금 정하자.", "작은 일정 하나부터 바로 움직이자.",
        "빈 목록을 첫 행동으로 채워보자.", "지금 끝낼 수 있는 목표 하나를 추가하자.",
        "오늘의 출발점을 직접 만들어보자.", "5분짜리 일정이라도 지금 시작하면 흐름이 생겨.",
        "가장 중요한 일 하나만 적고 바로 움직이자.", "첫 목표를 정하면 오늘의 속도가 붙을 거야.",
        "생각만 하던 일 하나를 일정으로 바꿔보자.",
      ],
      lively: [
        "오늘 목록이 반짝 비었네! 뭐부터 넣을까?", "빈 목록 발견! 첫 일정을 깨워보자!", "오늘의 첫 할 일은 무엇일까? 신나게 골라보자!",
        "아무 일정도 없다! 자유 시간 등장!", "첫 미션을 등록하면 돌 친구가 출동해!",
        "오늘의 빈칸을 어떤 재미있는 일로 채울까?", "목록이 조용해! 할 일 하나를 톡 깨워보자!",
        "새로운 일정이 나타날 자리를 비워뒀어!", "오늘의 첫 미션을 기다리는 중이야!",
        "쉬어도 좋고 시작해도 좋아! 무엇을 고를래?",
      ],
    }[personality], key);
  }
  if (mood === "complete") {
    return pickLine({
      warm: [
        `오늘 할 일 ${total}개를 다 끝냈네! 정말 잘했어`, `${total}개 모두 해냈어. 오늘도 충분히 멋졌어`, "오늘 계획을 전부 지켰네. 이제 편하게 쉬어도 돼",
        "끝까지 해낸 네가 정말 대단해", "오늘의 약속을 모두 지켰어. 마음 놓고 쉬자",
        `차근차근 ${total}개를 전부 완성했네`, "오늘도 네 힘으로 하루를 잘 마무리했어",
        "남은 일은 없어. 지금은 스스로를 칭찬할 시간이야", "완료한 일들이 돌 친구처럼 옹기종기 모였어",
        "오늘 할 만큼 충분히 했어. 따뜻하게 쉬자",
      ],
      cool: [
        `오늘 계획 ${total}개, 전부 완료.`, `${total}개 처리 완료. 오늘 일정은 끝.`, "남은 일정 없음. 오늘 목표 달성.",
        "오늘 할 일 처리율 100%.", "등록된 일정 전부 완료.",
        "오늘 목록 정리 끝. 추가 작업은 없어.", `${total}개 모두 완료 상태야.`,
        "계획대로 마무리했어.", "현재 미완료 일정 0개.", "오늘 목표는 정상적으로 끝났어.",
      ],
      driven: [
        `오늘 목표 ${total}개, 전부 끝냈어!`, `${total}개 완주! 이 흐름을 내일도 이어가자`, "오늘 목표 달성. 제대로 끝까지 해냈어!",
        "전부 완료! 오늘의 집중력이 제대로 통했어", "끝까지 밀어붙여서 목표를 달성했어!",
        "오늘의 실행력 최고야. 다음 목표도 해낼 수 있어", `${total}개를 모두 끝낸 흐름을 기억해두자`,
        "남은 일정 0개! 완벽하게 마무리했어", "오늘 세운 목표를 행동으로 전부 바꿨어",
        "완주 성공! 이 성취를 다음 도전의 힘으로 쓰자",
      ],
      lively: [
        `오늘 ${total}개 올클리어! 완전 멋져!`, `${total}개 전부 성공! 축하 파티 시작!`, "오늘 일정 완전 정복! 돌 친구들도 신났어!",
        "남은 미션 0개! 승리의 돌춤을 춰보자!", "오늘 할 일 대청소 완료! 와아!",
        "전부 해냈다! 돌 친구 왕국에 축포 발사!", "오늘의 미션 보드가 반짝반짝 빛나!",
        `${total}개 연속 성공! 오늘의 주인공은 너야!`, "완료 도장 쾅쾅! 이제 신나게 쉬자!",
        "오늘 일정 보스전 클리어! 완벽한 승리야!",
      ],
    }[personality], key);
  }
  if (mood === "progress") {
    return pickLine({
      warm: [
        `${complete}개 해냈어! 남은 ${remaining}개도 천천히 가보자`, `벌써 ${complete}개나 끝냈네. 남은 ${remaining}개도 네 속도로 가자`, `${complete}개 완료했어. 잠깐 숨 돌리고 다음으로 가도 좋아`,
        "한 걸음 내디뎠어. 지금 흐름이면 충분해", `남은 ${remaining}개도 하나씩 줄여가면 돼`,
        "이미 시작했다는 게 가장 큰 진전이야", "지금까지 한 만큼만 차분히 이어가보자",
        `${complete}개의 성취가 오늘을 든든하게 만들었어`, "서두르지 않아도 돼. 다음 일 하나만 바라보자",
        "잠깐 쉬었다가 마음 가는 일정으로 이어가자",
      ],
      cool: [
        `${complete}개 완료. 남은 ${remaining}개만 처리하자.`, `진행률 좋아. 이제 ${remaining}개 남았어.`, `${complete}개 처리했어. 다음 일정으로 넘어가자.`,
        `완료 ${complete}개, 미완료 ${remaining}개.`, "진행 중이야. 우선순위를 유지해.",
        "한 항목 끝났어. 다음 작업을 선택해.", `남은 일정은 ${remaining}개야.`,
        "현재 흐름은 정상적이야. 계속 진행해.", "완료한 항목은 제외했어. 다음 것만 보면 돼.",
        "진행 상황 확인 완료. 남은 목록을 처리하자.",
      ],
      driven: [
        `${complete}개 완료! 흐름 끊기 전에 ${remaining}개도 가자`, `좋아, ${complete}개 끝냈어! 다음 일정도 바로 이어가자`, `지금 속도 좋아. 남은 ${remaining}개까지 밀어보자!`,
        "첫 성공을 만들었어! 다음 목표로 바로 연결하자", "완료한 기세를 다음 일정에 그대로 써보자",
        `남은 ${remaining}개, 집중해서 하나씩 끝내자`, "지금이 탄력 붙이기 가장 좋은 순간이야",
        `${complete}개를 끝낸 실행력이면 충분히 가능해`, "다음 일 하나를 잡고 완료 흐름을 이어가자",
        "이미 움직이고 있어. 끝까지 밀어보자!",
      ],
      lively: [
        `${complete}개 성공! 남은 ${remaining}개도 신나게 가보자!`, `벌써 ${complete}개 완료! 다음 일정도 잡으러 가자!`, `${complete}개 해냈다! 돌 친구가 응원 중이야!`,
        "첫 돌 친구 획득! 다음 친구도 만나러 가자!", `남은 미션 ${remaining}개! 모험은 계속된다!`,
        "완료 도장 하나 추가! 기세 좋다!", "돌 친구가 폴짝 뛰었어! 다음 일정 출발!",
        `${complete}개 클리어! 오늘의 콤보를 이어가자!`, "와, 목록이 점점 짧아지고 있어!",
        "다음 미션을 깨면 또 새로운 돌이 기다려!",
      ],
    }[personality], key);
  }
  if (recommended > 0) {
    return pickLine({
      warm: [
        `오늘은 추천한 ${recommended}개부터 해보자`, `지금 하기 좋은 일정 ${recommended}개를 골라봤어`, `부담 적은 순서로 ${recommended}개 준비했어`,
        "네 시간에 맞는 일들만 살며시 골라뒀어", "지금 컨디션으로 시작하기 좋은 순서야",
        `오늘의 여유에 맞춰 ${recommended}개를 담아봤어`, "가장 편하게 시작할 수 있는 일부터 놓았어",
        "너무 무겁지 않게 오늘의 흐름을 만들어봤어", "첫 번째 일정만 시작해도 오늘은 충분히 움직이는 거야",
        "마음 가는 추천 하나부터 천천히 골라보자",
      ],
      cool: [
        `우선 처리할 ${recommended}개를 골랐어`, `조건에 맞는 일정 ${recommended}개를 추렸어.`, `지금은 이 ${recommended}개부터 처리하면 돼.`,
        "시간과 강도를 기준으로 순서를 정했어.", "추천 목록만 먼저 확인해.",
        `현재 조건에 맞는 항목은 ${recommended}개야.`, "완료한 일정은 제외하고 정리했어.",
        "예상 시간 안에 가능한 항목을 배치했어.", "추천 순서대로 처리하면 돼.",
        "지금 시작할 작업을 계산해서 골랐어.",
      ],
      driven: [
        `추천한 ${recommended}개부터 바로 시작하자`, `지금 움직이기 좋은 ${recommended}개를 골랐어`, `${recommended}개만 집중해서 빠르게 끝내보자!`,
        "실행하기 좋은 순서로 정리했어. 첫 번째부터 가자", "지금 컨디션에 맞는 목표로 바로 출발하자",
        `추천 ${recommended}개에 집중해서 오늘의 성과를 만들자`, "고민은 줄였어. 이제 첫 일정만 누르면 돼",
        "가장 효과적인 순서로 배치했어. 바로 움직이자", "추천 목록을 오늘의 집중 코스로 사용하자",
        "첫 번째 추천부터 끝내고 속도를 붙이자!",
      ],
      lively: [
        `오늘의 추천 ${recommended}개 등장! 골라서 출발!`, `지금 딱 좋은 일정 ${recommended}개 찾았다!`, `추천 일정 ${recommended}개 준비 완료! 신나게 골라보자!`,
        "곰의 오늘 미션 세트가 완성됐어!", `돌 친구가 추천 ${recommended}개를 데굴데굴 가져왔어!`,
        "지금 하기 좋은 미션만 쏙쏙 모았어!", "오늘의 추천 코스 오픈! 첫 관문부터 가자!",
        "할 일 사냥 지도가 완성됐어! 출발!", "추천 목록에서 마음 가는 미션을 잡아보자!",
        `${recommended}개의 보너스 미션이 너를 기다리고 있어!`,
      ],
    }[personality], key);
  }
  return pickLine({
    warm: [
      `오늘 할 일 ${filtered}개를 차근차근 보자`, `오늘 일정 ${filtered}개, 무리하지 말고 하나씩 해보자`, "지금 할 수 있는 일부터 편하게 시작해보자",
      "가장 마음 편한 일부터 골라도 괜찮아", "오늘의 속도는 네가 정하면 돼",
      `${filtered}개 중 작은 일 하나만 먼저 해볼까?`, "일정을 바라보는 것부터 이미 시작이야",
      "천천히 하나씩 완료 표시를 늘려보자", "급하지 않은 순서로 네 리듬을 만들어보자",
      "오늘도 부담 없이 한 걸음부터 가보자",
    ],
    cool: [
      `오늘 할 일 ${filtered}개를 정리했어`, `확인할 일정은 ${filtered}개야.`, "오늘 목록 정리 완료. 하나씩 처리하자.",
      `현재 일정 ${filtered}개.`, "목록을 확인하고 하나를 선택해.",
      "오늘 처리할 항목이 준비됐어.", "우선순위를 보고 시작하면 돼.",
      "미완료 일정만 순서대로 확인해.", `오늘 계획은 총 ${filtered}개야.`,
      "현재 목록에서 다음 작업을 선택해.",
    ],
    driven: [
      `오늘 할 일 ${filtered}개, 바로 시작하자`, `오늘 목표 ${filtered}개, 첫 일정부터 가자`, "준비 끝. 가장 중요한 일부터 시작하자!",
      "오늘의 목표를 행동으로 바꿀 시간이야", "가장 중요한 일정 하나를 지금 잡자",
      `${filtered}개를 순서대로 끝내며 흐름을 만들자`, "첫 번째 완료를 빠르게 만들어보자",
      "계획은 준비됐어. 이제 실행만 남았어", "오늘의 집중력을 첫 일정에 쏟아보자",
      "지금 시작하면 오늘 목표에 바로 가까워져!",
    ],
    lively: [
      `오늘 할 일 ${filtered}개 발견! 신나게 가보자!`, `오늘 일정 ${filtered}개 준비 완료! 출발!`, "할 일 사냥 시작! 첫 번째부터 잡으러 가자!",
      "오늘의 미션 보드 오픈! 무엇부터 깰까?", "돌 친구와 함께 첫 일정으로 돌진!",
      `${filtered}개의 미션이 반짝반짝 기다리고 있어!`, "완료 도장을 모으러 출발하자!",
      "오늘의 할 일 모험이 지금 시작됐어!", "첫 미션을 골라서 멋지게 클리어하자!",
      "목록 준비 완료! 돌 친구도 출발 준비 끝!",
    ],
  }[personality], key);
}

export function getBearCaption(
  personality: BearPersonality,
  context: "legendary" | "empty" | "complete" | "progress" | "recommendation",
  fallback: string,
  complete = 0,
) {
  if (context === "legendary") return "모든 성장 컬렉션을 모아 돌친구 왕국 수호곰이 찾아왔어";
  const copy = {
    warm: {
      empty: "빈 페이지도 괜찮아, 첫 줄부터 같이 시작하자",
      complete: "오늘의 돌 친구들이 모두 나와서 축하하고 있어",
      progress: `${complete}개의 성취를 모은 좋은 흐름이야`,
      recommendation: fallback,
    },
    cool: {
      empty: "할 일이 없으면 쉬어도 돼. 필요할 때 추가해.",
      complete: "오늘 계획 완료. 더 할 일은 없어.",
      progress: `${complete}개 완료. 현재 흐름은 좋아.`,
      recommendation: `조건에 맞는 순서로 정리했어 · ${fallback}`,
    },
    driven: {
      empty: "첫 일정 하나면 오늘의 흐름이 시작돼",
      complete: "오늘 목표 달성! 이 흐름을 기억해두자",
      progress: `${complete}개 완료! 지금 흐름을 이어갈 때야`,
      recommendation: `바로 움직일 수 있게 골랐어 · ${fallback}`,
    },
    lively: {
      empty: "빈 목록 발견! 오늘의 첫 일정을 기다리는 중!",
      complete: "돌 친구들도 전부 나와서 축하 파티 중!",
      progress: `벌써 ${complete}개 성공! 돌 친구가 신났어!`,
      recommendation: `오늘의 추천 준비 완료! · ${fallback}`,
    },
  } as const;
  return copy[personality][context];
}

export function getEmptyTaskCopy(personality: BearPersonality, activeTab: string): EmptyCopy {
  const target = activeTab === "오늘" ? "오늘" : activeTab;
  return {
    warm: {
      title: `${target} 일정은 아직 비어 있어`,
      description: "생각나는 것 하나만 편하게 적어줘. 정리는 내가 도와줄게.",
      action: "첫 할 일 추가",
    },
    cool: {
      title: `${target} 일정 없음`,
      description: "필요한 일정이 생기면 하나 추가하면 돼.",
      action: "일정 추가",
    },
    driven: {
      title: `${target} 일정, 지금 하나 만들어보자`,
      description: "가장 먼저 끝내고 싶은 일부터 적으면 바로 시작할 수 있어.",
      action: "바로 추가",
    },
    lively: {
      title: `${target} 칸이 조용해!`,
      description: "첫 일정을 깨워볼까? 생각나는 일을 톡 적어줘!",
      action: "일정 깨우기",
    },
  }[personality];
}
