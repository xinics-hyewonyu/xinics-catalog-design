import { forwardRef, type LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required, className, children, ...rest },
  ref,
) {
  return (
    <label
      ref={ref}
      className={[
        "inline-flex items-center gap-xxs text-sm font-medium text-text-body",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
      {required ? (
        <span aria-label="필수" className="text-error">
          *
        </span>
      ) : null}
    </label>
  );
});
