import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-[var(--xds-control-height-sm)] text-xs",
  md: "h-[var(--xds-control-height-md)] text-sm",
  lg: "h-[var(--xds-control-height-lg)] text-md",
};

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: Size;
  iconLeading?: ReactNode;
  iconTrailing?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", iconLeading, iconTrailing, error, className, ...rest },
  ref,
) {
  return (
    <div
      className={[
        "relative flex w-full items-center rounded-md border bg-surface-elevated text-text-body",
        "transition-colors duration-150",
        error
          ? "border-error-border focus-within:border-error"
          : "border-border-default focus-within:border-primary",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--xds-focus-ring-color)]",
        sizeClasses[size],
        className ?? "",
      ].join(" ")}
    >
      {iconLeading ? (
        <span
          aria-hidden
          className="pointer-events-none flex shrink-0 items-center pl-sm text-text-caption"
        >
          {iconLeading}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={[
          "min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-disabled",
          // Hide the native search clear button (the "✕" glyph) in favor of iconTrailing.
          "[&::-webkit-search-cancel-button]:appearance-none [&::-ms-clear]:hidden",
          iconLeading ? "pl-xs" : "pl-[var(--xds-control-padding-x)]",
          iconTrailing ? "pr-xs" : "pr-[var(--xds-control-padding-x)]",
        ].join(" ")}
        {...rest}
      />
      {iconTrailing ? (
        <span className="flex shrink-0 items-center pr-sm text-text-caption">
          {iconTrailing}
        </span>
      ) : null}
    </div>
  );
});
