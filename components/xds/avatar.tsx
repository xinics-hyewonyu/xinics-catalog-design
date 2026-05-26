"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-12 text-md",
  xl: "size-16 text-lg",
};

interface AvatarProps
  extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: Size;
}

export const Avatar = forwardRef<
  ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(function Avatar({ size = "md", className, ...rest }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={[
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-muted text-text-body",
        sizeClasses[size],
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const AvatarImage = forwardRef<
  ElementRef<typeof AvatarPrimitive.Image>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...rest }, ref) {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={["aspect-square size-full object-cover", className ?? ""].join(
        " ",
      )}
      {...rest}
    />
  );
});

export const AvatarFallback = forwardRef<
  ElementRef<typeof AvatarPrimitive.Fallback>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...rest }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={[
        "flex size-full items-center justify-center font-medium",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});
