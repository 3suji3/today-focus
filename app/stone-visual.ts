export function stoneMotif(name: string) {
  const motifs: Array<[string, string[]]> = [
    // Longer, more specific names must be checked before their shared suffixes.
    ["strawberry-milk", ["딸기우유"]],
    ["sun", ["햇살", "태양", "해님"]],
    ["milk", ["우유빛", "우유돌"]],
    ["egg", ["새알"]],
    ["cozy", ["포근"]],
    ["dawn", ["새벽", "여명"]],
    ["raincloud", ["먹구름", "소나기"]],
    ["sesame", ["참깨", "깨돌"]],
    ["pencil", ["연필"]],
    ["stripe", ["줄무늬", "빗금"]],
    ["rainbow", ["무지개"]],
    ["aurora", ["오로라"]],
    ["shell", ["조개", "자개"]],
    ["bell", ["은방울", "종소리"]],
    ["fire", ["모닥불", "불꽃", "노을", "석양"]],
    ["wind", ["바람", "풍차"]],
    ["toast", ["토스트", "식빵"]],
    ["peach", ["복숭아", "살구"]],
    ["whale", ["고래"]],
    ["butterfly", ["나비"]],
    ["crown", ["왕관", "왕국", "여왕", "왕"]],
    ["moon", ["초승달", "반달", "달빛", "달무리", "달토끼", "달의", "달돌"]],
    ["star", ["별", "은하", "우주", "행성", "혜성", "유성", "밤하늘"]],
    ["cloud", ["구름", "안개", "솜"]],
    ["flower", ["꽃", "벚꽃", "민들레", "연꽃", "라벤더", "수국", "산호"]],
    ["leaf", ["잎", "이끼", "새싹", "풀", "숲", "단풍", "솔방울", "도토리", "나이테"]],
    ["water", ["물", "파도", "호수", "연못", "비", "소다", "방울", "바다", "조개", "해파리"]],
    ["gem", ["수정", "보석", "유리", "진주", "자개", "얼음", "오로라"]],
    ["fruit", ["포도", "라임", "레몬", "자몽", "멜론", "유자", "귤", "밤톨"]],
    ["sweet", ["쿠키", "푸딩", "사탕", "캔디", "꿀", "밀크티", "민트초코"]],
    ["snow", ["눈", "겨울", "북극"]],
  ];
  return motifs.find(([, keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[0] ?? "pebble";
}

const stoneThemes: Array<[string, string[]]> = [
  ["pink", ["딸기", "복숭아", "분홍", "벚꽃", "산호", "살구"]],
  ["mint", ["민트", "이끼", "숲", "새싹", "잎", "라임", "연두", "풀", "나무", "연꽃"]],
  ["blue", ["물", "파도", "호수", "바다", "소다", "유리", "얼음", "비", "고래", "청록"]],
  ["purple", ["보라", "보랏", "라일락", "라벤더", "포도", "은하", "오로라", "자수정"]],
  ["gold", ["햇살", "태양", "유자", "레몬", "꿀", "황금", "금빛", "별"]],
  ["orange", ["노을", "석양", "귤", "호박", "불", "토스트", "식빵", "쿠키"]],
  ["white", ["우유", "구름", "눈", "진주", "솜", "소금", "새알"]],
  ["night", ["밤", "달", "혜성", "우주", "왕국"]],
];

export function stoneVisualProfile(name: string, index: number) {
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const unsignedHash = hash >>> 0;
  return {
    motif: stoneMotif(name),
    theme: stoneThemes.find(([, keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[0] ?? "natural",
    detail: (unsignedHash + index) % 8,
    angle: (unsignedHash + index * 29) % 180,
  };
}
