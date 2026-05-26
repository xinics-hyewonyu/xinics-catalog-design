import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "default" | "dashed" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeading?: ReactNode;
  iconTrailing?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-text-on-primary border border-transparent hover:bg-primary-hover active:bg-primary-active",
  default:
    "bg-surface-elevated text-text-body border border-border-default hover:bg-surface-muted",
  dashed:
    "bg-surface-elevated text-text-body border border-dashed border-border-default hover:bg-surface-muted",
  danger:
    "bg-error text-text-on-danger border border-transparent hover:bg-error-hover active:bg-error-active",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-[var(--xds-control-height-sm)] px-sm text-xs",
  md: "h-[var(--xds-control-height-md)] px-[var(--xds-control-padding-x)] text-sm",
  lg: "h-[var(--xds-control-height-lg)] px-md text-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "default",
      size = "md",
      loading = false,
      disabled,
      iconLeading,
      iconTrailing,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center gap-xs rounded-md font-medium",
          "transition-colors duration-150",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[var(--xds-focus-ring-color)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "motion-reduce:transition-none",
          variantClasses[variant],
          sizeClasses[size],
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {loading ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          iconLeading
        )}
        <span>{children}</span>
        {!loading && iconTrailing}
      </button>
    );
  },
);
