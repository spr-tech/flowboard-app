import Link from "next/link";
import DesktopNav from "@/components/landing/DesktopNav";
import MobileNav from "@/components/landing/MobileNav";
import {
  LayoutDashboard,
  Kanban,
  Handshake,
  BellRing,
  TrendingUp,
  ShieldAlert,
  Zap,
  // Menu,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen ">
      {/* Navbar */}
      <div className="bg-[#2a1699] ">
        <DesktopNav />
        <MobileNav />
      </div>
      {/* Hero */}
      <section className="bg-[#1E1B2E] px-6 py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-[#7C3AED]/20 text-[#A78BFA] text-xs px-3 py-1.5 rounded-full mb-6">
          <LayoutDashboard className="w-3 h-3" />
          Built for modern teams
        </div>
        <h1 className="text-4xl font-medium text-white max-w-xl leading-tight mb-4">
          Manage projects. Track tasks. Ship faster.
        </h1>
        <p className="text-white/50 text-sm max-w-md leading-relaxed mb-8">
          FlowBoard gives your team a clean, focused workspace to plan work, hit
          deadlines, and stay in sync without the clutter.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="bg-white text-[#1E1B2E] rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="#features"
            className="border border-white/20 text-white/80 rounded-lg px-5 py-2.5 text-sm hover:bg-white/10 transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-white border-b border-[#E5E7EB] grid grid-cols-1 md:grid-cols-3">
        <div className="py-8 text-center border-b md:border-r border-[#E5E7EB]">
          <div className="text-2xl font-medium text-[#7C3AED]">12k+</div>
          <div className="text-xs text-[#6B7280] mt-1">
            Teams using FlowBoard
          </div>
        </div>
        <div className="py-8 text-center border-b md:border-r border-[#E5E7EB]">
          <div className="text-2xl font-medium text-[#7C3AED]">98%</div>
          <div className="text-xs text-[#6B7280] mt-1">
            Customer satisfaction
          </div>
        </div>
        <div className="py-8 text-center">
          <div className="text-2xl font-medium text-[#7C3AED]">3x</div>
          <div className="text-xs text-[#6B7280] mt-1">
            Faster project delivery
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#F9FAFB] px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium text-[#111827] text-center mb-2">
            Everything your team needs
          </h2>
          <p className="text-sm text-[#6B7280] text-center mb-12">
            All the tools to plan, track, and deliver work in one place.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Kanban />,
                title: "Kanban boards",
                desc: "Visualise your workflow with drag-and-drop task cards across customisable columns.",
                bg: "#EDE9FE",
                color: "#7C3AED",
              },
              {
                icon: <Handshake />,
                title: "Team collaboration",
                desc: "Assign tasks, set roles, and keep your whole team on the same page in real time.",
                bg: "#D1FAE5",
                color: "#10B981",
              },
              {
                icon: <TrendingUp />,
                title: "Progress tracking",
                desc: "At-a-glance progress bars and stat cards so you always know where things stand.",
                bg: "#FEF3C7",
                color: "#F59E0B",
              },
              {
                icon: <BellRing />,
                title: "Smart alerts",
                desc: "Get notified when tasks are assigned to you or deadlines are approaching.",
                bg: "#FEE2E2",
                color: "#EF4444",
              },
              {
                icon: <ShieldAlert />,
                title: "Role-based access",
                desc: "Owners, members, and viewers control exactly who can see and edit what.",
                bg: "#EDE9FE",
                color: "#7C3AED",
              },
              {
                icon: <Zap />,
                title: "One-click deploy",
                desc: "Built on Next.js and Vercel  deploy updates instantly with zero downtime.",
                bg: "#D1FAE5",
                color: "#10B981",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white border border-[#E5E7EB] rounded-xl p-5 transition-all duration-300 hover:border-b-[#7C3AED] hover:shadow-sm cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: feature.bg, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <div className="text-sm font-medium text-[#111827] mb-1">
                  {feature.title}
                </div>
                <div className="text-xs text-[#6B7280] leading-relaxed">
                  {feature.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#7C3AED] px-6 py-16 text-center">
        <h2 className="text-2xl font-medium text-white mb-2">
          Ready to get your team organised?
        </h2>
        <p className="text-white/70 text-sm mb-6">
          Join thousands of teams already shipping faster with FlowBoard.
        </p>
        <Link
          href="/register"
          className="bg-white text-[#7C3AED] rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors inline-block"
        >
          Start for free &rarr; No card needed
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E1B2E] px-6 py-5 flex items-center justify-between">
        <span className="text-white/40 text-xs">© 2026 FlowBoard</span>
        <div className="flex items-center gap-5">
          <span className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
            Privacy
          </span>
          <span className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
            Terms
          </span>
          <span className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
            Contact
          </span>
        </div>
      </footer>
    </div>
  );
}
