"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...rest }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={[
        "border-b border-border-subtle last:border-b-0",
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export const AccordionTrigger = forwardRef<
  ElementRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...rest }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={[
          "group flex flex-1 items-center justify-between gap-sm py-sm",
          "text-sm font-medium text-text-heading",
          "hover:text-primary transition-colors motion-reduce:transition-none",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[var(--xds-focus-ring-color)]",
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-text-caption transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

export const AccordionContent = forwardRef<
  ElementRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...rest }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className="overflow-hidden text-sm text-text-body"
      {...rest}
    >
      <div className={["pb-sm", className ?? ""].join(" ")}>{children}</div>
    </AccordionPrimitive.Content>
  );
});
