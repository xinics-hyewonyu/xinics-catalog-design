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
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", iconLeading, error, className, ...rest },
  ref,
) {
  return (
    <div
      className={[
        "relative inline-flex w-full items-center rounded-md border bg-surface-elevated text-text-body",
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
          className="pointer-events-none flex items-center pl-sm text-text-caption"
        >
          {iconLeading}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={[
          "w-full bg-transparent outline-none placeholder:text-text-disabled",
          iconLeading ? "pl-xs pr-sm" : "px-[var(--xds-control-padding-x)]",
        ].join(" ")}
        {...rest}
      />
    </div>
  );
});
