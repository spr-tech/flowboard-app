import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast/toaster";
import { StoreProvider } from "@/stores/storeProvider";

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

export const metadata: Metadata = {
  title: "Flowboard",
  description: "Manage projects. Track tasks. Ship faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
