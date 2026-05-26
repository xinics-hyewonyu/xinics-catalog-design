import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={error || undefined}
        className={[
          "w-full rounded-md border bg-surface-elevated px-[var(--xds-control-padding-x)] py-xs text-sm text-text-body",
          "transition-colors duration-150 placeholder:text-text-disabled",
          error
            ? "border-error-border focus-within:border-error"
            : "border-border-default focus-within:border-primary",
          "focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--xds-focus-ring-color)]",
          "resize-y min-h-[5rem]",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
    );
  },
);
