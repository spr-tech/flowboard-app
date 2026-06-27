"use client";

import { LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

const DesktopNav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 hidden md:flex items-center transition-all duration-300 ${
        scrolled
          ? "bg-[#1E1B2E]/60 backdrop-blur-md p-3 left-80 right-80 mt-4 rounded-xl justify-between h-14"
          : "bg-[#1E1B2E] left-0 right-0 h-14 justify-between px-6"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className={`bg-[#7C3AED] rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${scrolled ? "w-6 h-6" : "w-8 h-8"}`}
        >
          <LayoutDashboard
            className={`text-white transition-all duration-300 ${scrolled ? "w-3 h-3" : "w-4 h-4"}`}
          />
        </div>
        <span
          className={`text-white font-medium transition-all duration-300 ${scrolled ? "text-sm" : "text-base"}`}
        >
          FlowBoard
        </span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-6">
        <Link
          href="#features"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Features
        </Link>
        <Link
          href="#pricing"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Pricing
        </Link>
        <Link
          href="#docs"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Docs
        </Link>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="border border-white/20 text-white/80 rounded-lg px-4 py-1.5 text-sm hover:bg-white/10 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="bg-white text-[#1E1B2E] rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
};

export default DesktopNav;
