import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

type Elevation = "flat" | "raised" | "interactive";

const elevationClasses: Record<Elevation, string> = {
  flat: "bg-surface-elevated border border-border-subtle",
  raised:
    "bg-surface-elevated border border-border-subtle shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  interactive:
    "bg-surface-elevated border border-border-subtle shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer",
};

interface CardProps extends ComponentPropsWithoutRef<"article"> {
  elevation?: Elevation;
}

export const Card = forwardRef<ElementRef<"article">, CardProps>(function Card(
  { elevation = "raised", className, ...rest },
  ref,
) {
  const isInteractive = elevation === "interactive";
  return (
    <article
      ref={ref}
      tabIndex={isInteractive ? 0 : undefined}
      className={[
        "overflow-hidden rounded-lg",
        elevationClasses[elevation],
        isInteractive
          ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)]"
          : "",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});
