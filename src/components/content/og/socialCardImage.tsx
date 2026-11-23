import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { brandColours } from "@/utilities/constants/brandColours";
import { SITE_NAME } from "@/utilities/constants/site";

// The social card shown when a Flowboard link is shared (opengraph-image.tsx, twitter-image.tsx).
// next/og draws it with Satori, which knows no Tailwind classes or CSS variables, so colours come
// from brandColours and the layout is inline styles (every multi-child box needs display: flex).

export const socialCardSize = { width: 1200, height: 630 };
export const socialCardAlt = "Flowboard: move your team's work from idea to done.";

const { espresso, cream, vermilion, lime, cocoa } = brandColours;

// Satori reads static fonts only (TTF, OTF or WOFF), not the variable one next/font serves.
const fontPath = join(process.cwd(), "src/assets/fonts/BricolageGrotesque-ExtraBold.woff");

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30">
      <rect width="30" height="30" rx="9" fill={espresso} />
      <rect x="7" y="7" width="4" height="16" rx="2" fill={vermilion} />
      <rect x="13" y="7" width="4" height="11" rx="2" fill={lime} />
      <rect x="19" y="7" width="4" height="7" rx="2" fill={cream} />
    </svg>
  );
}

function SocialCard() {
  const word = { marginRight: 22 };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: cream,
        color: espresso,
        fontFamily: "Bricolage Grotesque",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Mark size={72} />
        <span style={{ fontSize: 52, letterSpacing: "-0.02em" }}>{SITE_NAME}</span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: 92,
          lineHeight: 1.08,
          letterSpacing: "-0.045em",
          maxWidth: 1000,
        }}
      >
        <span style={word}>Move</span>
        <span style={word}>your</span>
        <span style={word}>team&apos;s</span>
        <span style={word}>work</span>
        <span style={word}>from</span>
        <span
          style={{
            ...word,
            backgroundColor: lime,
            borderRadius: 14,
            padding: "0 16px",
            transform: "rotate(-2.5deg)",
          }}
        >
          idea
        </span>
        <span style={word}>to</span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span>done.</span>
          <span style={{ height: 12, marginTop: -6, borderRadius: 6, backgroundColor: vermilion }} />
        </span>
      </div>

      <div style={{ display: "flex", fontSize: 32, color: cocoa }}>A Kanban workspace for small teams</div>
    </div>
  );
}

export async function socialCardImage(): Promise<ImageResponse> {
  const font = await readFile(fontPath);
  return new ImageResponse(<SocialCard />, {
    ...socialCardSize,
    fonts: [{ name: "Bricolage Grotesque", data: font, weight: 800, style: "normal" }],
  });
}
