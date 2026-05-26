import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info";
type Size = "sm" | "md";

const toneClasses: Record<Tone, string> = {
  default: "bg-neutral-bg text-neutral-text border-neutral-border",
  success: "bg-success-bg text-success-text border-success-border",
  warning: "bg-warning-bg text-warning-text border-warning-border",
  danger: "bg-error-bg text-error-text border-error-border",
  info: "bg-info-bg text-info-text border-info-border",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-5 px-xs text-xs gap-xxs",
  md: "h-6 px-sm text-xs gap-xs",
};

interface TagProps extends ComponentPropsWithoutRef<"span"> {
  tone?: Tone;
  size?: Size;
}

export const Tag = forwardRef<ElementRef<"span">, TagProps>(function Tag(
  { tone = "default", size = "sm", className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={[
        "inline-flex items-center rounded-full border font-medium",
        toneClasses[tone],
        sizeClasses[size],
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
});
