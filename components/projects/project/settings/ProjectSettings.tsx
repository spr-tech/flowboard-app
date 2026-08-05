"use client";

import EditProject from "./EditProject";
import Members from "./MembersOverview";
import DangerZone from "./DangerZone";
import Link from "next/link";

export default function ProjectSettings() {
  return (
    <div className="max-w-6xl px-8 py-8 mx-auto">
      {/* Header */}
      <Link
        className="flex items-center gap-2 mb-4 text-sm transition-all duration-200 hover:-translate-x-0.5  text-slate-600"
        href="/projects"
      >
        <span> ←</span>
        <span className="hover:underline underline-offset-2">
          Back to Projects
        </span>
      </Link>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
          Project Settings
        </h1>

        <p className="mt-2 text-sm text-[#6B7280]">
          Manage your project&apos;s information, members and permissions.
        </p>
      </header>

      {/* Content */}
      <div className="grid items-start grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side */}
        <section className="lg:col-span-2">
          <EditProject />
        </section>

        {/* Right Side */}
        <aside className="space-y-6">
          <Members />

          <DangerZone />
        </aside>
      </div>
    </div>
  );
}
