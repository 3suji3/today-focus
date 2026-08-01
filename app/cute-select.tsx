"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type SelectValue = string | number;

export default function CuteSelect<T extends SelectValue>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      } else {
        setActiveIndex((index) => (index + direction + options.length) % options.length);
      }
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
    }
  }

  const selected = options[selectedIndex] ?? options[0];

  return <div className={`cute-select${open ? " open" : ""}${disabled ? " disabled" : ""}`} ref={rootRef}>
    <button
      type="button"
      role="combobox"
      className="cute-select-trigger"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
      disabled={disabled}
      onClick={() => { setActiveIndex(selectedIndex); setOpen((current) => !current); }}
      onKeyDown={handleKeyDown}
    >
      <span className="cute-select-pebble" aria-hidden="true">•ᴗ•</span>
      <strong>{selected?.label ?? "선택하기"}</strong>
      <i aria-hidden="true" />
    </button>
    {open && <div className="cute-select-menu" id={listId} role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button
        type="button"
        id={`${listId}-${index}`}
        role="option"
        aria-selected={option.value === value}
        className={`${index === activeIndex ? "active" : ""}${option.value === value ? " selected" : ""}`}
        key={String(option.value)}
        onPointerEnter={() => setActiveIndex(index)}
        onClick={() => choose(index)}
      >
        <span>{option.label}</span>
        <b aria-hidden="true">{option.value === value ? "✓" : ""}</b>
      </button>)}
    </div>}
  </div>;
}
