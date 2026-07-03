"use client";

import React, { useState, useRef } from "react";

interface CreateProjectModalProps {
  onClose: () => void;
}

export default function CreateProjectModal({
  onClose,
}: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [projectColor, setProjectColor] = useState("#7C3AED");

  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-5">
        <h2 className="text-xl font-semibold text-gray-900">Create Project</h2>

        {/* Project Name */}
        <div className="w-full flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Project Name
          </label>

          <input
            id="name"
            type="text"
            placeholder="e.g. Website Redesign"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Description */}
        <div className="w-full flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description
          </label>

          <textarea
            id="description"
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[90px] px-3 py-2 border border-gray-300 rounded-lg resize-none outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* color */}

        <div className="flex flex-col gap-1 ">
          <label htmlFor="color" className="text-sm font-medium text-gray-700">
            Color
          </label>

          <div className="flex items-center gap-2 w-full  px-3 py-2 border border-gray-300 rounded-lg resize-none outline-none focus-within:ring-1 focus-within:ring-[#7C3AED]">
            <div
              style={{ backgroundColor: projectColor }}
              className="w-8 h-8 rounded-md border"
              onClick={() => colorInputRef.current?.click()}
            />
            <input
              type="color"
              value={projectColor}
              ref={colorInputRef}
              onChange={(e) => setProjectColor(e.target.value)}
              className=" hidden  w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />

            <input
              type="text"
              className=" border-none outline-none text-gray-600"
              value={projectColor}
              onChange={(e) => setProjectColor(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="due_date " className="text-gray-800 text-sm">
            Due date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED] text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
