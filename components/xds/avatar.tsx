import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

type Size = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-10 text-md",
};

interface AvatarProps extends ComponentPropsWithoutRef<"span"> {
  size?: Size;
  src?: string | null;
  alt?: string;
  name?: string | null;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export const Avatar = forwardRef<ElementRef<"span">, AvatarProps>(
  function Avatar(
    { size = "sm", src, alt, name, className, children, ...rest },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={[
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
          "bg-neutral-bg text-neutral-text border border-border-subtle font-medium",
          sizeClasses[size],
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? name ?? ""}
            className="size-full object-cover"
          />
        ) : (
          (children ?? initials(name))
        )}
      </span>
    );
  },
);
