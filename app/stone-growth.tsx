import { stoneSpeciesIndexes } from "./stone-catalog";
import StoneFace from "./stone-face";
import { getStoneEasterEgg } from "../lib/stone-achievements";
import { stoneStageCollection, type StoneStageKey } from "../lib/stone-stages";

export { stoneStageCollection, type StoneStageKey } from "../lib/stone-stages";

export type StoneStats = {
  weekly: number;
  current: number;
  weekStartedAt: number;
};
export function visibleStoneCount(stageKey: Exclude<StoneStageKey, "auto">, total: number) {
  if (stageKey === "first") return Math.min(total, 1);
  if (stageKey === "friends") return Math.min(total, 6);
  return Math.min(total, 14);
}

export default function StoneGrowth({ stats, motion = null, selectedStage = "auto" }: { stats: StoneStats; motion?: "added" | "removed" | null; selectedStage?: StoneStageKey }) {
  const automaticStage = getStage(stats.current);
  const selected = selectedStage === "auto" ? null : stoneStageCollection.find((stage) => stage.key === selectedStage && stats.current >= stage.unlockAt);
  const stage = selected ? { ...selected, kind: selected.key, nextAt: null, nextTitle: "" } : automaticStage;
  const visiblePebbles = visibleStoneCount(stage.kind, stats.current);
  const pebbleStart = Math.max(0, stats.current - visiblePebbles);
  const visibleSpecies = stoneSpeciesIndexes(stats.current, visiblePebbles, pebbleStart);
  const easterEgg = getStoneEasterEgg(stats.current);

  return (
    <div className={`stone-growth${motion ? ` ${motion}` : ""}`} aria-live="polite">
      <div className={`stone-stage stone-stage-${stage.kind}${easterEgg ? ` easter-${easterEgg.kind}` : ""}`}>
        {stats.current === 0 ? (
          <div className="empty-stone-spot"><span>＋</span><p>할 일을 완료하면 첫 돌 친구를 만나</p></div>
        ) : (
          <div className="pebble-pile" aria-label={`성장 장면에 전시된 돌 친구 ${visiblePebbles}개`}>
            {visibleSpecies.map((species, index) => (
              <StoneFace index={species} className="mini-pebble" ariaHidden key={`${species}-${index}`} style={{ "--i": index } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>
      <div className="stone-stage-copy">
        <strong>{stage.title}</strong>
        <span>{selected ? "고른 성장 모습으로 전시 중" : stage.nextAt ? `성취 ${stage.nextAt - stats.current}개를 더 모으면 ${stage.nextTitle}` : "누적 성취 15,000개로 모든 성장 모습을 열었어"}</span>
      </div>
      {easterEgg && <p className={`stone-easter-egg ${easterEgg.kind}`}><strong>{easterEgg.title}</strong><span>{easterEgg.message}</span></p>}
      <div className="stone-totals">
        <p>이번 주 성취 <strong>{stats.weekly}</strong></p>
        <p>누적 성취 <strong>{stats.current}</strong></p>
      </div>
    </div>
  );
}

function getStage(count: number) {
  const unlocked = [...stoneStageCollection].reverse().find((stage) => count >= stage.unlockAt) ?? stoneStageCollection[0];
  const next = stoneStageCollection.find((stage) => stage.unlockAt > count);
  return { ...unlocked, kind: unlocked.key, nextAt: next?.unlockAt ?? null, nextTitle: next?.title ?? "" };
}
