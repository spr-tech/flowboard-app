import Link from "next/link";
import type { ReactNode } from "react";

import { LandingFooter } from "@/components/content/landing/landingFooter";
import { Logo } from "@/components/ui/logo/logo";

/** Shown on both pages. Change it whenever either page's wording changes. */
export const LEGAL_LAST_UPDATED = "24 November 2026";

type LegalPageProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

/** The privacy and terms pages: the landing page's colours and footer around a readable column of text. */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page text-fg-primary">
      <header className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="rounded-lg" aria-label="Flowboard home">
            <Logo />
          </Link>
          <Link href="/login" className="text-[15px] font-semibold text-fg-link hover:text-fg-link-hover">
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 pt-6 pb-20 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-display-section leading-none font-extrabold tracking-[-0.04em]">{title}</h1>
          <p className="mt-4 text-sm text-fg-muted">Last updated {LEGAL_LAST_UPDATED}</p>
          <p className="mt-6 text-lg leading-relaxed text-fg-secondary">{intro}</p>
          <div className="mt-10 flex flex-col gap-10">{children}</div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 leading-relaxed text-fg-secondary">
      <h2 className="text-2xl font-bold tracking-[-0.02em] text-fg-primary">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-fg-muted">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** The support address as a mail link, or a visible placeholder when EMAIL_USER wasn't set at build time. */
export function ContactEmail({ email }: { email: string | null }) {
  if (!email) return <strong className="text-fg-primary">[support email]</strong>;
  return (
    <a href={`mailto:${email}`} className="font-semibold break-all text-fg-link hover:text-fg-link-hover">
      {email}
    </a>
  );
}
