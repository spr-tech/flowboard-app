"use client";

import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const MobileNav = () => {
  const [open, setOpen] = useState(false);

  // Lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile navbar — logo + hamburger */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#1E1B2E] flex md:hidden items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center shrink-0">
            <Image
              src="/flowboard logo.svg"
              alt="FlowBoard"
              width={50}
              height={50}
            />{" "}
          </div>
          <span className="text-base font-medium text-white ">FlowBoard</span>
        </div>

        {/* Hamburger / X */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="text-white hover:cursor-pointer "
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile modal — slides below navbar */}
      {open && (
        <div className="fixed top-14 left-0 right-0 bottom-0 z-40 bg-[#1E1B2E] flex flex-col px-6 py-8 md:hidden">
          {/* Nav links */}-
          <div className="flex flex-col gap-1">
            <Link
              href="#features"
              className="px-4 py-3 text-base transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/5"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="px-4 py-3 text-base transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/5"
            >
              Pricing
            </Link>
            <Link
              href="#docs"
              className="px-4 py-3 text-base transition-colors rounded-lg text-white/80 hover:text-white hover:bg-white/5"
            >
              Docs
            </Link>
          </div>

          {/* Divider */}
          <div className="h-px my-6 bg-white/10" />

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full px-4 py-3 text-sm text-center transition-colors border rounded-lg border-white/20 text-white/80 hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="w-full text-center bg-white text-[#1E1B2E] rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
