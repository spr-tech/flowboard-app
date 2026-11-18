"use client";

import type { ReactNode } from "react";

import {
  Accordion as AccordionRoot,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/primitives/accordion";

export type AccordionEntry = {
  id: string;
  title: string;
  content: ReactNode;
};

export type AccordionProps = {
  items: AccordionEntry[];
  /** Which item starts open. Omit to start with all closed. */
  defaultOpenId?: string;
};

/** Stacked cards where one opens at a time. Radix gives it arrow-key and Home/End navigation. */
export function Accordion({ items, defaultOpenId }: AccordionProps) {
  return (
    <AccordionRoot type="single" collapsible defaultValue={defaultOpenId} className="gap-2.5">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="group/item rounded-card border border-line-subtle bg-surface-card not-last:border-b"
        >
          <AccordionTrigger className="min-h-16 items-center gap-4 rounded-card px-5.5 text-[17px] font-semibold text-fg-primary hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden">
            {item.title}
            <span
              aria-hidden
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-page text-xl text-fg-primary group-data-[state=open]/item:bg-surface-inverse group-data-[state=open]/item:text-highlight"
            >
              <span className="group-data-[state=open]/item:hidden">+</span>
              <span className="hidden group-data-[state=open]/item:inline">−</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5.5 pb-5.5 text-base leading-relaxed text-fg-secondary">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </AccordionRoot>
  );
}
