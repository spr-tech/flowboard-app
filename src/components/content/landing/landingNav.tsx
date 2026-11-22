"use client";

import { useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Logo } from "@/components/ui/logo/logo";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { landingMenuClosed, landingMenuToggled, selectIsLandingMenuOpen } from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";
import { useScrollLock } from "@/utilities/hooks/useScrollLock";
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
/** Tailwind's md breakpoint: from here the menu button is gone, so an open menu closes. */
const MD_UP = "(min-width: 48rem)";
const FOCUSABLE = "a[href], button:not([disabled])";
/** Space between the bottom of the nav bar and the menu's first row. */
const PANEL_GAP_PX = 16;

/**
 * Sticky on every screen. From md up: logo, section links, Sign in and Get started.
 * Under md: just the logo and a round menu button (Sign in and Get started don't fit beside them;
 * the menu offers "Create a free board" and "Sign in" instead). The menu is a full-screen cream
 * panel under the bar: the page behind it can't scroll and doesn't show through, focus stays
 * inside it, and a section link closes it and then scrolls to that section.
 * Its open state lives in the UI slice, like the app shell's drawer.
 */
export function LandingNav() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsLandingMenuOpen);
  const close = () => dispatch(landingMenuClosed());
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  /** The section a link tap asked for, scrolled to once the page is unlocked. */
  const pendingSection = useRef<string | null>(null);

  useScrollLock(isOpen);

  // The panel starts just below the bar, wherever the sticky bar sits right now.
  useLayoutEffect(() => {
    if (!isOpen || !navRef.current || !panelRef.current) return;
    panelRef.current.style.paddingTop = `${navRef.current.getBoundingClientRect().bottom + PANEL_GAP_PX}px`;
  }, [isOpen]);

  // Opening: focus the first link. Closing: focus goes back to the button (or to the logo when the
  // screen has widened and the button is hidden), then a tapped section is scrolled to. This runs
  // after useScrollLock has put the page back, so the scroll isn't undone.
  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    else if (wasOpen.current) {
      const target = window.matchMedia(MD_UP).matches ? logoRef.current : buttonRef.current;
      target?.focus({ preventScroll: true });
      const section = pendingSection.current;
      pendingSection.current = null;
      if (section) document.getElementById(section.slice(1))?.scrollIntoView({ block: "start" });
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // While open: Escape closes, Tab and Shift+Tab cycle through the X and the menu's items, and
  // widening to md closes (the menu only exists under md).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch(landingMenuClosed());
        return;
      }
      if (event.key !== "Tab") return;
      const items = [buttonRef.current, ...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
        (item): item is HTMLElement => item !== null
      );
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      const next = index < 0 ? 0 : (index + step + items.length) % items.length;
      items[next]?.focus();
    };
    const widened = window.matchMedia(MD_UP);
    const onWiden = (event: MediaQueryListEvent) => {
      if (event.matches) dispatch(landingMenuClosed());
    };
    document.addEventListener("keydown", onKeyDown);
    widened.addEventListener("change", onWiden);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      widened.removeEventListener("change", onWiden);
    };
  }, [isOpen, dispatch]);

  // Leaving the page with the menu open mustn't leave it open for next time.
  useEffect(() => () => void dispatch(landingMenuClosed()), [dispatch]);

  /** A section link in the menu: close first (which puts the page back), then scroll there. */
  const goToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    pendingSection.current = href;
    window.history.pushState(null, "", href);
    close();
  };

  return (
    <header className="sticky top-3 z-50 px-6 pt-5">
      <div className="relative mx-auto max-w-300">
        <nav
          ref={navRef}
          aria-label="Main"
          className="relative z-10 flex items-center justify-between gap-3 rounded-full border border-line-subtle bg-surface-card/90 py-2.5 pr-2.5 pl-5.5 shadow-sm backdrop-blur md:gap-4"
        >
          <Link ref={logoRef} href="#top" onClick={close} className="shrink-0 rounded-lg">
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
            <ButtonLink
              href="/register"
              text="Get started"
              onClick={close}
              className={cn("max-md:hidden", buttonLift)}
            />
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

        {/* Always in the page (hidden when closed) so aria-controls points at something.
            It covers the whole screen; the bar sits on top of it and its top padding clears the bar. */}
        <div
          ref={panelRef}
          id={MENU_ID}
          hidden={!isOpen}
          className="fixed inset-0 overflow-y-auto overscroll-contain bg-surface-page px-6 pb-10 motion-safe:animate-menu-cover-in md:hidden"
        >
          <div className="mx-auto flex max-w-300 flex-col motion-safe:animate-menu-in">
            <nav aria-label="Sections">
              <ul>
                {sectionLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={(event) => goToSection(event, link.href)}
                      className="flex h-16 items-center gap-4 rounded-2xl px-3.5 font-heading text-[28px] font-bold tracking-tight transition-colors hover:bg-surface-sunken"
                    >
                      <span aria-hidden className={cn("size-3 shrink-0 rounded-full", link.dot)} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <hr className="mx-3.5 my-5 border-line-divider" />
            <div className="flex flex-col gap-3 px-1">
              <ButtonLink
                href="/register"
                text="Create a free board"
                variant="inverse"
                size="lg"
                onClick={close}
                className={cn("w-full", buttonLift)}
              />
              <ButtonLink
                href="/login"
                text="Sign in"
                variant="outline"
                size="lg"
                onClick={close}
                className={cn("w-full", buttonLift)}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
