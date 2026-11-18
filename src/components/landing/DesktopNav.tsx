"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
        <Image
          src="/flowboard logo.svg"
          alt="FlowBoard"
          width={30}
          height={30}
        />

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

//const DesktopNav = () => {
// const [scrolled, setScrolled] = useState(false);

// scrolled — a piece of state that starts as false
// meaning "the user has not scrolled yet"
// when it becomes true, the navbar will shrink
// when it becomes false again, the navbar will expand back

// useEffect(() => {
// useEffect runs this code once when the component
// first appears on screen, then never again
// the empty [] at the end is what causes that "run once" behavior

//   const handleScroll = () => {
// this function runs every single time the user scrolls
// window.scrollY is a number that tells you how many pixels
// the user has scrolled down from the very top of the page
// window.scrollY > 30 returns true if they scrolled more than 30px
// and false if they scrolled less than 30px
// that true or false goes straight into setScrolled
// which updates the scrolled state above
//    setScrolled(window.scrollY > 30);
// };

// this tells the browser to call handleScroll
// every single time the user scrolls anywhere on the page
// think of it like hiring a guard whose only job
// is to watch for scrolling and report it

//    window.addEventListener("scroll", handleScroll);

// this is the cleanup function
// when the user navigates away and this component disappears
// React calls this function automatically
// it fires the guard and removes the scroll listener
// so it doesnt keep running in the background wasting memory
// return () => window.removeEventListener("scroll", handleScroll);
//}, []);
