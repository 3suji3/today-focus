"use client";

import { useEffect, useRef, useState } from "react";

function moveMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function CuteDatePicker({ value, min, disabled = false, onChange }: { value: string; min: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const popoverRef = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondayOffset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const [, selectedMonth, selectedDay] = value.split("-").map(Number);

  function showCalendar() {
    setMonth(value.slice(0, 7));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      popoverRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return <div className="cute-date-picker">
    <button type="button" className="cute-date-trigger" disabled={disabled} aria-expanded={open} onClick={() => open ? setOpen(false) : showCalendar()}>
      <span className="cute-date-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
          <path d="M8 13h2M14 13h2M8 16.5h2M14 16.5h2" />
        </svg>
      </span>
      <strong>{Number(value.slice(0, 4))}년 {selectedMonth}월 {selectedDay}일</strong><small>날짜를 눌러 달력 열기</small><b className="cute-date-chevron" aria-hidden="true" />
    </button>
    {open && <div className="cute-calendar-popover" ref={popoverRef} role="dialog" aria-label="일정 날짜 선택">
      <div className="cute-calendar-head"><button type="button" disabled={month <= min.slice(0, 7)} onClick={() => setMonth((current) => moveMonth(current, -1))} aria-label="이전 달">‹</button><strong>{year}년 {monthNumber}월</strong><button type="button" onClick={() => setMonth((current) => moveMonth(current, 1))} aria-label="다음 달">›</button></div>
      <div className="cute-calendar-weekdays" aria-hidden="true">{["월", "화", "수", "목", "금", "토", "일"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="cute-calendar-days">{cells.map((day, index) => {
        if (!day) return <span key={`empty-${index}`} />;
        const dateKey = `${month}-${String(day).padStart(2, "0")}`;
        const unavailable = dateKey < min;
        return <button type="button" key={dateKey} disabled={unavailable} className={`${dateKey === value ? "selected " : ""}${dateKey === todayKey() ? "today" : ""}`} onClick={() => { onChange(dateKey); setOpen(false); }}><span>{day}</span>{dateKey === value && <i aria-hidden="true">•ᴗ•</i>}</button>;
      })}</div>
      <p><span aria-hidden="true">✦</span> 고른 날부터 돌 친구가 기다릴게</p>
    </div>}
  </div>;
}
