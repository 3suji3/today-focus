import type { CSSProperties } from "react";
import { stoneCatalog, stoneFaces, stoneShapeIndex } from "./stone-catalog";
import { stoneVisualProfile } from "./stone-visual";

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
  const visual = stoneVisualProfile(stoneName, index);
  return <span
    className={`stone-face stone-shape-${stoneShapeIndex(index)} stone-motif-${visual.motif} stone-theme-${visual.theme} stone-detail-${visual.detail}${index >= 160 ? " generated-stone" : ""}${className ? ` ${className}` : ""}`}
    aria-label={ariaLabel}
    aria-hidden={ariaHidden || undefined}
    style={{ ...generatedPalette, "--stone-detail-angle": `${visual.angle}deg`, ...style } as CSSProperties}
    title={title}
  >
    <span className={`stone-face-fill codex-pebble-${index}${innerClassName ? ` ${innerClassName}` : ""}`} aria-hidden="true">
      <i className="stone-name-detail" />
      <i className="stone-motif-art" />
      <span className="stone-face-glyph">{face ?? stoneFaces[index % stoneFaces.length]}</span>
    </span>
  </span>;
}
