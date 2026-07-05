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
        <div className="absolute right-4 bg-[#7C3AED] text-white">
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast:
                  "bg-[#7C3AED] text-white border-none shadow-xl rounded-xl w-fit min-w-0",
                title: "text-white font-medium",
                description: "text-white/80",
              },
            }}
          />
        </div>
      </body>
    </html>
  );
}
