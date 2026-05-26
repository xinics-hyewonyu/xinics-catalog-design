"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
  open,
  defaultOpen,
  onOpenChange,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className="z-[60] rounded-md px-sm py-xxs text-xs bg-neutral-900 text-white shadow-md"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-neutral-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = forwardRef<
  ElementRef<typeof TooltipPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(function TT(props, ref) {
  return <TooltipPrimitive.Trigger ref={ref} {...props} />;
});
