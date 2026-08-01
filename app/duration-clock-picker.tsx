"use client";

import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const minuteMarks = Array.from({ length: 12 }, (_, index) => index * 5);

export default function DurationClockPicker({ minutes, allDay, disabled = false, onChange }: {
  minutes: number;
  allDay: boolean;
  disabled?: boolean;
  onChange: (value: { minutes: number; allDay: boolean }) => void;
}) {
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const dialRef = useRef<HTMLDivElement>(null);
  const hours = Math.max(0, Math.min(12, Math.floor(minutes / 60)));
  const minutePart = Math.max(0, Math.min(55, Math.round((minutes % 60) / 5) * 5));
  const labels = mode === "hour" ? Array.from({ length: 12 }, (_, index) => index + 1) : minuteMarks;
  const selected = mode === "hour" ? (hours || 12) : minutePart;
  const summary = allDay ? "하루 종일" : hours ? `${hours}시간${minutePart ? ` ${minutePart}분` : ""}` : `${minutePart || 5}분`;
  const handRotation = useMemo(() => mode === "hour" ? (selected % 12) * 30 : selected * 6, [mode, selected]);

  function choose(value: number) {
    if (disabled) return;
    if (mode === "hour") onChange({ allDay: false, minutes: Math.max(5, value * 60 + minutePart) });
    else onChange({ allDay: false, minutes: Math.max(5, hours * 60 + value) });
  }

  function chooseFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const angle = (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 450) % 360;
    choose(mode === "hour" ? (Math.round(angle / 30) || 12) : (Math.round(angle / 30) % 12) * 5);
  }

  return <div className={`duration-clock-picker${allDay ? " all-day" : ""}`}>
    <div className="duration-clock-head">
      <div><span>예상 시간</span><strong>{summary}</strong></div>
      <button type="button" className={allDay ? "active" : ""} disabled={disabled} aria-pressed={allDay} onClick={() => onChange({ allDay: !allDay, minutes: allDay ? Math.max(5, minutes) : 480 })}>하루 종일</button>
    </div>
    {!allDay && <>
      <div className="duration-clock-tabs" aria-label="시간 또는 분 선택">
        <button type="button" className={mode === "hour" ? "active" : ""} onClick={() => setMode("hour")}>시간</button>
        <button type="button" className={mode === "minute" ? "active" : ""} onClick={() => setMode("minute")}>분</button>
      </div>
      <div className="duration-clock-dial" ref={dialRef} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); chooseFromPointer(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) chooseFromPointer(event); }}>
        <i className="duration-clock-hand" style={{ transform: `translateX(-50%) rotate(${handRotation}deg)` }} />
        <b className="duration-clock-center" />
        {labels.map((label, index) => {
          const angle = index * 30;
          return <button type="button" key={label} disabled={disabled} className={selected === label ? "selected" : ""} style={{ "--clock-angle": `${angle}deg` } as CSSProperties} onClick={() => choose(label)}>{mode === "minute" ? String(label).padStart(2, "0") : label}</button>;
        })}
      </div>
      <p>{mode === "hour" ? "1시간 단위로 고르고, 분 탭에서 세밀하게 맞춰줘." : "5분 단위로 고를 수 있어. 숫자까지 드래그해도 돼."}</p>
    </>}
  </div>;
}
