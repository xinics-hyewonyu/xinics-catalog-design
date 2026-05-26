"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

type Size = "sm" | "md" | "lg";

const triggerSizeClasses: Record<Size, string> = {
  sm: "h-[var(--xds-control-height-sm)] text-xs",
  md: "h-[var(--xds-control-height-md)] text-sm",
  lg: "h-[var(--xds-control-height-lg)] text-md",
};

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

interface SelectTriggerProps
  extends ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  size?: Size;
}

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(function SelectTrigger({ size = "md", className, children, ...rest }, ref) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={[
        "inline-flex w-full items-center justify-between gap-sm rounded-md border border-border-default",
        "bg-surface-elevated pl-sm pr-xs text-text-body",
        "transition-colors duration-150",
        "hover:bg-surface-muted",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "data-[placeholder]:text-text-disabled",
        triggerSizeClasses[size],
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-4 text-text-caption" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent(
  { className, children, position = "popper", sideOffset = 6, ...rest },
  ref,
) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={[
          "relative z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border-subtle bg-surface-elevated",
          "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
          "max-h-(--radix-select-content-available-height)",
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        <SelectPrimitive.Viewport className="p-xxs">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...rest }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={[
        "relative flex cursor-pointer select-none items-center gap-xs rounded-sm py-xs pl-xl pr-sm text-sm text-text-body outline-none",
        "data-[highlighted]:bg-surface-muted data-[highlighted]:text-text-body",
        "data-[state=checked]:font-medium",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-60",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      <span className="absolute left-sm flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden className="size-3.5 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});

export const SelectSeparator = forwardRef<
  ElementRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(function SelectSeparator({ className, ...rest }, ref) {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={["my-xxs h-px bg-border-subtle", className ?? ""].join(" ")}
      {...rest}
    />
  );
});
