import type { CSSProperties } from "react";
import { stoneCatalog, stoneFaces, stoneShapeIndex } from "./stone-catalog";

function stoneMotif(name: string) {
  const motifs: Array<[string, string[]]> = [
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
    ["strawberry-milk", ["딸기우유"]],
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

export default function StoneFace({
  index,
  className = "",
  innerClassName = "",
  face,
  ariaLabel,
  ariaHidden = false,
  style,
  title,
}: {
  index: number;
  className?: string;
  innerClassName?: string;
  face?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
  style?: CSSProperties;
  title?: string;
}) {
  const generatedPalette = index >= 160
    ? {
      "--stone-hue": (index * 47) % 360,
      "--stone-hue-alt": (index * 47 + 42) % 360,
      "--stone-angle": `${105 + (index % 7) * 11}deg`,
    } as CSSProperties
    : {};
  const stoneName = stoneCatalog[index]?.[0] ?? "돌 친구";
  const motif = stoneMotif(stoneName);
  return <span
    className={`stone-face stone-shape-${stoneShapeIndex(index)} stone-motif-${motif}${index >= 160 ? " generated-stone" : ""}${className ? ` ${className}` : ""}`}
    aria-label={ariaLabel}
    aria-hidden={ariaHidden || undefined}
    style={{ ...generatedPalette, ...style }}
    title={title}
  >
    <span className={`stone-face-fill codex-pebble-${index}${innerClassName ? ` ${innerClassName}` : ""}`} aria-hidden="true">
      <i className="stone-motif-art" />
      <span className="stone-face-glyph">{face ?? stoneFaces[index % stoneFaces.length]}</span>
    </span>
  </span>;
}
