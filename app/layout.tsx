import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FlowBoard",
  description: "Manage projects. Track tasks. Ship faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          duration={1800}
          expand={false}
          visibleToasts={3}
          toastOptions={{
            style: {
              background: "#7C3AED",
              color: "#FFFFFF",
              border: "1px solid #6D28D9",
            },
          }}
        />
      </body>
    </html>
  );
}
