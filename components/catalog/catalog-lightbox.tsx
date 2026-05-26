"use client";

import Image from "next/image";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  alt: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 8;

export function CatalogLightbox({ open, onOpenChange, imageUrl, alt }: Props) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const apiRef = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset zoom whenever a new image is shown
  useEffect(() => {
    if (open) {
      setScale(1);
      // Defer to next tick so TransformWrapper has mounted
      requestAnimationFrame(() => apiRef.current?.resetTransform());
    }
  }, [open, imageUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const api = apiRef.current;
      if (!api) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        api.resetTransform();
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        api.zoomToElement(
          (e.target as HTMLElement) ?? document.body,
          1,
          0,
        );
        api.setTransform(0, 0, 1, 0);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        api.zoomIn(0.25);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        api.zoomOut(0.25);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  const isZoomed = scale > 1.001;
  const percent = Math.round(scale * 100);

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        // Close on background click — only when not zoomed (to avoid conflict with drag)
        if (e.target === e.currentTarget && !isZoomed) onOpenChange(false);
      }}
    >
      <Controls
        percent={percent}
        isZoomed={isZoomed}
        onZoomIn={() => apiRef.current?.zoomIn(0.25)}
        onZoomOut={() => apiRef.current?.zoomOut(0.25)}
        onToggleFit={() => {
          const api = apiRef.current;
          if (!api) return;
          if (isZoomed) api.resetTransform();
          else api.setTransform(0, 0, 1, 200);
        }}
        onClose={() => onOpenChange(false)}
      />

      <div
        className={`relative flex-1 min-h-0 w-full overflow-hidden ${
          isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
      >
        <TransformWrapper
          ref={(ref) => {
            apiRef.current = ref;
          }}
          initialScale={1}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          wheel={{ step: 0.05 }}
          doubleClick={{ mode: "toggle", step: 1 }}
          panning={{ disabled: false, velocityDisabled: true }}
          onTransform={(ref) => setScale(ref.state.scale)}
          limitToBounds={false}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src={imageUrl}
              alt={alt}
              width={1920}
              height={1080}
              draggable={false}
              priority
              className="max-h-full max-w-full select-none object-contain"
              unoptimized
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function Controls({
  percent,
  isZoomed,
  onZoomIn,
  onZoomOut,
  onToggleFit,
  onClose,
}: {
  percent: number;
  isZoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute right-md top-md z-10 flex items-center gap-xs rounded-md bg-black/60 p-xxs text-white shadow-lg backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <IconButton
        label="축소 (-)"
        onClick={onZoomOut}
        icon={<Minus className="size-4" aria-hidden />}
      />
      <span
        className="min-w-[3.5rem] select-none text-center text-xs tabular-nums"
        aria-live="polite"
      >
        {percent}%
      </span>
      <IconButton
        label="확대 (+)"
        onClick={onZoomIn}
        icon={<Plus className="size-4" aria-hidden />}
      />
      <span className="mx-xxs h-5 w-px bg-white/20" />
      <IconButton
        label={isZoomed ? "화면맞춤 (0)" : "원본 사이즈 (1)"}
        onClick={onToggleFit}
        icon={<Maximize2 className="size-4" aria-hidden />}
      />
      <span className="mx-xxs h-5 w-px bg-white/20" />
      <IconButton
        label="닫기 (Esc)"
        onClick={onClose}
        icon={<X className="size-4" aria-hidden />}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-sm text-white/90 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors motion-reduce:transition-none"
    >
      {icon}
    </button>
  );
}
