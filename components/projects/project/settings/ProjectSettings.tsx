"use client";

import EditProject from "./EditProject";
import Members from "./Members";
import DangerZone from "./DangerZone";

export default function ProjectSettings() {
  return (
    <div className="px-8 py-8 mx-auto max-w-7xl">
      {/* Header */}
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