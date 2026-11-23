import { Bricolage_Grotesque, Inter } from "next/font/google";

// Shared by the root layout and global-error.tsx (which replaces the root layout when it fails).
// Both are variable fonts, so one file covers every weight the designs use
// (Inter 400–600, Bricolage 500–800). `opsz` lets large headings use the tighter display cut.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz"],
  display: "swap",
});

/** Put on <html>: sets --font-inter and --font-bricolage, which globals.css uses. */
export const fontVariables = `${inter.variable} ${bricolage.variable}`;
