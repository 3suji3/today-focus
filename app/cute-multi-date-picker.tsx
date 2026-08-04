"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_MULTI_DATES } from "../lib/multi-date";

function moveMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function selectionLabel(values: string[]) {
  if (values.length === 1) {
    const [year, month, day] = values[0].split("-").map(Number);
    return `${year}년 ${month}월 ${day}일`;
  }
  return `${values.length}개 날짜 선택됨`;
}

export default function CuteMultiDatePicker({ values, min, disabled = false, onChange }: { values: string[]; min: string; disabled?: boolean; onChange: (values: string[]) => void }) {
  const safeValues = values.length ? [...values].sort() : [min];
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(safeValues[0].slice(0, 7));
  const popoverRef = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => popoverRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function toggleDate(dateKey: string) {
    if (safeValues.includes(dateKey)) {
      if (safeValues.length === 1) return;
      onChange(safeValues.filter((value) => value !== dateKey));
      return;
    }
    if (safeValues.length >= MAX_MULTI_DATES) return;
    onChange([...safeValues, dateKey].sort());
  }

  return <div className="cute-date-picker cute-multi-date-picker">
    <button type="button" className="cute-date-trigger" disabled={disabled} aria-expanded={open} onClick={() => { setMonth(safeValues[0].slice(0, 7)); setOpen((current) => !current); }}>
      <span className="cute-date-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" /><path d="M8 13h2M14 13h2M8 16.5h2M14 16.5h2" /></svg></span>
      <strong>{selectionLabel(safeValues)}</strong><small>달력에서 띄엄띄엄 여러 날을 고를 수 있어</small><b className="cute-date-chevron" aria-hidden="true" />
    </button>
    {open && <div className="cute-calendar-popover" ref={popoverRef} role="dialog" aria-label="일정 날짜 여러 개 선택">
      <div className="cute-calendar-head"><button type="button" disabled={month <= min.slice(0, 7)} onClick={() => setMonth((current) => moveMonth(current, -1))} aria-label="이전 달">‹</button><strong>{year}년 {monthNumber}월</strong><button type="button" onClick={() => setMonth((current) => moveMonth(current, 1))} aria-label="다음 달">›</button></div>
      <div className="cute-calendar-weekdays" aria-hidden="true">{["월", "화", "수", "목", "금", "토", "일"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="cute-calendar-days">{cells.map((day, index) => {
        if (!day) return <span key={`empty-${index}`} />;
        const dateKey = `${month}-${String(day).padStart(2, "0")}`;
        const selected = safeValues.includes(dateKey);
        return <button type="button" key={dateKey} disabled={dateKey < min || (!selected && safeValues.length >= MAX_MULTI_DATES)} aria-pressed={selected} className={`${selected ? "selected " : ""}${dateKey === todayKey() ? "today" : ""}`} onClick={() => toggleDate(dateKey)}><span>{day}</span>{selected && <i aria-hidden="true">•ᴗ•</i>}</button>;
      })}</div>
      <div className="cute-multi-date-footer"><p><span aria-hidden="true">✦</span> {safeValues.length}개 선택 · 다시 누르면 선택 해제</p><button type="button" onClick={() => setOpen(false)}>선택 완료</button></div>
    </div>}
  </div>;
}
