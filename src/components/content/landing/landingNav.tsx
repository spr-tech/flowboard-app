"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Logo } from "@/components/ui/logo/logo";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { landingMenuClosed, landingMenuToggled, selectIsLandingMenuOpen } from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";
import { buttonLift } from "./landingMotion";

// Each link lights up in a different brand colour and tips like a sticker on hover (desktop);
// on phones the same colour marks each section's dot in the menu.
const sectionLinks = [
  { label: "How it works", href: "#how", hover: "hover:bg-highlight hover:text-fg-on-highlight", dot: "bg-highlight" },
  { label: "Features", href: "#features", hover: "hover:bg-primary hover:text-fg-on-primary", dot: "bg-primary" },
  {
    label: "Why Flowboard",
    href: "#why",
    hover: "hover:bg-surface-inverse hover:text-highlight",
    dot: "bg-surface-inverse",
  },
  { label: "FAQ", href: "#faq", hover: "hover:bg-surface-sunken hover:text-fg-primary", dot: "bg-status-low-fg" },
];

const MENU_ID = "landing-menu";

/**
 * Sticky on every screen. From md up: logo, section links, Sign in and Get started.
 * Under md: one row (logo, Get started, a round menu button); the menu drops in below the bar.
 * Its open state lives in the UI slice, like the app shell's drawer.
 */
export function LandingNav() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsLandingMenuOpen);
  const close = () => dispatch(landingMenuClosed());
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Focus goes into the menu when it opens, and back to the button when it closes.
  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    else if (wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Escape and a tap outside close it.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(landingMenuClosed());
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) dispatch(landingMenuClosed());
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen, dispatch]);

  // Leaving the page with the menu open mustn't leave it open for next time.
  useEffect(() => () => void dispatch(landingMenuClosed()), [dispatch]);

  return (
    <header className="sticky top-3 z-50 px-6 pt-5">
      <div ref={containerRef} className="relative mx-auto max-w-300">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-3 rounded-full border border-line-subtle bg-surface-card/90 py-2.5 pr-2.5 pl-5.5 shadow-sm backdrop-blur md:gap-4"
        >
          <Link href="#top" className="shrink-0 rounded-lg">
            <Logo variant="onLight" />
          </Link>
          <div className="hidden gap-7 text-[15px] md:flex">
            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn("rounded-full px-3.5 py-2 text-fg-secondary transition hover:-rotate-3", link.hover)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink href="/login" text="Sign in" variant="ghost" className={cn("max-md:hidden", buttonLift)} />
            <ButtonLink href="/register" text="Get started" className={buttonLift} />
            <button
              ref={buttonRef}
              type="button"
              onClick={() => dispatch(landingMenuToggled())}
              aria-expanded={isOpen}
              aria-controls={MENU_ID}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface-sunken text-fg-primary transition-colors hover:bg-line-subtle md:hidden"
            >
              {/* Two lines that turn into an X. */}
              <span
                aria-hidden
                className={cn(
                  "absolute h-0.5 w-4.5 rounded-full bg-current motion-safe:transition-[translate,rotate] motion-safe:duration-250",
                  isOpen ? "translate-y-0 rotate-45" : "-translate-y-[3.5px]"
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute h-0.5 w-4.5 rounded-full bg-current motion-safe:transition-[translate,rotate] motion-safe:duration-250",
                  isOpen ? "translate-y-0 -rotate-45" : "translate-y-[3.5px]"
                )}
              />
            </button>
          </div>
        </nav>

        {/* Always in the page (hidden when closed) so aria-controls points at something. */}
        <div
          ref={panelRef}
          id={MENU_ID}
          hidden={!isOpen}
          className="absolute inset-x-0 top-full mt-2 rounded-[28px] border border-line-subtle bg-surface-card p-3 shadow-tile motion-safe:animate-menu-in md:hidden"
        >
          <nav aria-label="Sections">
            <ul>
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="flex h-13 items-center gap-3.5 rounded-2xl px-3.5 font-heading text-[22px] font-bold tracking-tight transition-colors hover:bg-surface-page"
                  >
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", link.dot)} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <hr className="mx-3.5 my-3 border-line-divider" />
          <div className="grid grid-cols-2 gap-2.5 px-1 pb-1">
            <ButtonLink href="/login" text="Sign in" variant="outline" onClick={close} className={buttonLift} />
            <ButtonLink
              href="/register"
              text="Create a free board"
              variant="inverse"
              onClick={close}
              className={cn("px-3", buttonLift)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
