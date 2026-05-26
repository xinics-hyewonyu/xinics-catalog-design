"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "danger";

const sizeClasses: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

const toneRingClasses: Record<Tone, string> = {
  default: "",
  danger: "ring-2 ring-error/40",
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

interface ModalContentProps
  extends ComponentPropsWithoutRef<typeof Dialog.Content> {
  size?: Size;
  tone?: Tone;
  showClose?: boolean;
}

export const ModalContent = forwardRef<
  ElementRef<typeof Dialog.Content>,
  ModalContentProps
>(function ModalContent(
  {
    size = "md",
    tone = "default",
    showClose = true,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <Dialog.Content
        ref={ref}
        className={[
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
          "flex flex-col overflow-hidden",
          "rounded-lg border border-border-subtle bg-surface-elevated",
          "shadow-[0_10px_40px_rgba(0,0,0,0.18)]",
          "focus:outline-none",
          sizeClasses[size],
          toneRingClasses[tone],
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {children}
        {showClose ? (
          <Dialog.Close
            aria-label="닫기"
            className={[
              "absolute right-md top-md inline-flex size-8 items-center justify-center",
              "rounded-md text-text-caption hover:bg-surface-muted hover:text-text-body",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[var(--xds-focus-ring-color)]",
              "transition-colors motion-reduce:transition-none",
            ].join(" ")}
          >
            <X aria-hidden className="size-4" />
          </Dialog.Close>
        ) : null}
      </Dialog.Content>
    </Dialog.Portal>
  );
});

export const ModalHeader = forwardRef<
  ElementRef<"header">,
  ComponentPropsWithoutRef<"header">
>(function ModalHeader({ className, ...rest }, ref) {
  return (
    <header
      ref={ref}
      className={[
        "flex flex-col gap-xxs px-lg pt-lg pb-md pr-[3.5rem]",
        "border-b border-border-subtle",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const ModalTitle = forwardRef<
  ElementRef<typeof Dialog.Title>,
  ComponentPropsWithoutRef<typeof Dialog.Title>
>(function ModalTitle({ className, ...rest }, ref) {
  return (
    <Dialog.Title
      ref={ref}
      className={[
        "text-lg font-semibold text-text-heading leading-korean",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const ModalDescription = forwardRef<
  ElementRef<typeof Dialog.Description>,
  ComponentPropsWithoutRef<typeof Dialog.Description>
>(function ModalDescription({ className, ...rest }, ref) {
  return (
    <Dialog.Description
      ref={ref}
      className={[
        "text-sm text-text-caption leading-korean",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const ModalBody = forwardRef<
  ElementRef<"div">,
  ComponentPropsWithoutRef<"div">
>(function ModalBody({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={["flex-1 overflow-y-auto", className ?? ""].join(" ")}
      {...rest}
    />
  );
});

export const ModalFooter = forwardRef<
  ElementRef<"footer">,
  ComponentPropsWithoutRef<"footer">
>(function ModalFooter({ className, ...rest }, ref) {
  return (
    <footer
      ref={ref}
      className={[
        "flex items-center justify-end gap-sm px-lg py-md",
        "border-t border-border-subtle",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const ModalClose = Dialog.Close;
