"use client";

/* eslint-disable @next/next/no-img-element */

import { memo, useCallback, useEffect, useRef, useState } from "react";

type ImageStatus = "loading" | "loaded" | "error";

function SafeImage({
  src,
  alt,
  className = "",
  compact = false,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  compact?: boolean;
  eager?: boolean;
}) {
  const [imageState, setImageState] = useState<{ src: string; status: ImageStatus }>({ src, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const status = imageState.src === src ? imageState.status : "loading";
  const handleLoad = useCallback(() => {
    setImageState({ src, status: "loaded" });
  }, [src]);
  const handleError = useCallback(() => {
    setImageState({ src, status: "error" });
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    const timer = window.setTimeout(() => setImageState({ src, status: image.naturalWidth > 0 ? "loaded" : "error" }), 0);
    return () => window.clearTimeout(timer);
  }, [attempt, src]);

  return (
    <span className={`safe-image ${status}${compact ? " compact" : ""}`}>
      {status === "loading" && (
        <span className="image-loading" role="status">
          <i aria-hidden="true">•ᴗ•</i>
          <em>{compact ? "준비 중" : "그림 불러오는 중…"}</em>
        </span>
      )}
      {status === "error" && (
        <span className="image-error" role="status">
          <em>{compact ? "불러오기 실패" : "그림을 불러오지 못했어"}</em>
          <button type="button" onClick={() => { setImageState({ src, status: "loading" }); setAttempt((value) => value + 1); }}>다시 시도</button>
        </span>
      )}
      <img
        ref={imageRef}
        key={`${src}-${attempt}`}
        src={src}
        alt={status === "loaded" ? alt : ""}
        className={className}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "low"}
        onLoad={handleLoad}
        onError={handleError}
      />
    </span>
  );
}

export default memo(SafeImage);
