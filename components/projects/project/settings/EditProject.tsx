"use client";

import { useProject } from "@/context/ProjectProvider";
import { useRef, useState } from "react";

export default function EditProject() {
  const { currentProject } = useProject();

  const [projectName, setProjectName] = useState(currentProject?.name ?? "");
  const [description, setDescription] = useState(
    currentProject?.description ?? ""
  );

  const [color, setColor] = useState(currentProject?.color ?? "#7C3AED");

  const existingDueDate = currentProject?.dueDate
    ? new Date(currentProject.dueDate).toISOString().split("T")[0]
    : "";

  const [dueDate, setDueDate] = useState(existingDueDate);

  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-[#111827]">Edit Project</h2>

        <p className="mt-1 text-sm text-[#6B7280]">
          Update your project's information.
        </p>
      </div>

      {/* Form */}
      <form className="p-6 space-y-6">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Project Name
          </label>

          <input
            id="name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Website Redesign"
            className="w-full h-11 px-4 rounded-xl border border-gray-300 outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
        </div>

        {/* Description */}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this project..."
            className="w-full min-h-[140px] px-4 py-3 rounded-xl border border-gray-300 resize-none outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
        </div>

        {/* Color */}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Project Color
          </label>

          <div
            className="flex items-center gap-3 h-12 px-4 border border-gray-300 rounded-xl cursor-pointer
            focus-within:border-[#7C3AED]
            focus-within:ring-4
            focus-within:ring-[#7C3AED]/10"
          >
            <div
              onClick={() => colorInputRef.current?.click()}
              className="w-8 h-8 border rounded-lg"
              style={{
                backgroundColor: color,
              }}
            />

            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="hidden"
            />

            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 text-gray-700 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Due Date */}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="dueDate"
            className="text-sm font-medium text-gray-700"
          >
            Due Date
          </label>

          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-300 outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
        </div>

        {/* Footer */}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="px-6 font-medium text-white transition bg-purple-600 h-11 rounded-xl hover:bg-purple-700 active:[0.98]"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
