import { memo } from "react";
import { stoneCatalog, stoneSpeciesIndexes, unlockedStoneEntries } from "./stone-catalog";
import { stoneStageCollection } from "./stone-growth";
import StoneFace from "./stone-face";

const reversedStoneStages = [...stoneStageCollection].reverse();

function StoneShareVisual({ total, weekly, compact = false }: { total: number; weekly: number; compact?: boolean }) {
  const stones = unlockedStoneEntries(total);
  const stage = reversedStoneStages.find((item) => total >= item.unlockAt) ?? stoneStageCollection[0];
  const stageSpecies = stoneSpeciesIndexes(total, 4, Math.max(0, total - 4));

  return <div className={`stone-share-visual${compact ? " compact" : ""}`}>
    <p className="shared-achievement-line"><strong>{total}</strong><span>개의 성취를 모았어</span></p>
    <p className="shared-weekly-line">이번 주 성취는 <strong>{weekly}개</strong>야</p>
    <div className="shared-collection-stage">
      <div className={`shared-stage-art stone-stage-${stage.key}`}>
        <div className="shared-stage-pebbles" aria-hidden="true">{stageSpecies.map((species, index) => <StoneFace index={species} className="shared-stage-stone" ariaHidden key={`${species}-${index}`} />)}</div>
      </div>
      <p><span>현재 성장 컬렉션</span><strong>{stage.title}</strong><small>누적 {stage.unlockAt.toLocaleString("ko-KR")}개에 해금</small></p>
    </div>
    <div className="shared-species-heading"><strong>만난 돌 친구</strong><span>{stones.length} / {stoneCatalog.length}종</span></div>
    <div className="shared-species-grid" aria-label={`발견한 돌 친구 ${stones.length}종`}>
      {stones.length ? stones.map(({ name, index }) => <span className="shared-species-item" title={name} key={name}><StoneFace index={index} className="shared-species-stone" ariaHidden /><small>{name}</small></span>) : <span className="shared-empty-stone">첫 돌 친구를 기다리는 중</span>}
    </div>
    <p className="share-description">할 일을 끝내며 차곡차곡 발견한 작은 돌 친구들이에요.</p>
  </div>;
}

export default memo(StoneShareVisual);
