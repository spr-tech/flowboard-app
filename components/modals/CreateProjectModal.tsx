"use client";

import React, { useState, useRef } from "react";
// import { Pipette } from "lucide-react";

// const PRESET_COLORS = [
//   "#FF6B6B",
//   "#4D96FF",
//   "#6BCB77",
//   "#FFD93D",
//   "#005F73",
//   "#FF007F",
//   "#7B2CBF",
//   "#264653",
// ];

interface CreateProjectModalProps {
  onClose: () => void;
}

export default function CreateProjectModal({
  onClose,
}: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  //   const [projectColor, setProjectColor] = useState("#7B2CBF");

  //   const colorInputRef = useRef<HTMLInputElement>(null);

  //   const handleColorTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //     let val = e.target.value;

  //     if (!val.startsWith("#") && val.length > 0) {
  //       val = "#" + val;
  //     }

  //     setProjectColor(val);
  //   };

  //   const handleSubmit = (e: React.FormEvent) => {
  //     e.preventDefault();

  //     console.log({
  //       projectName,
  //       description,
  //       projectColor,
  //     });

  //     // We'll connect this to the Server Action later.
  //   };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form
        // onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-5"
      >
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
            className="text-slate-800 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED]"
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
            className="w-full min-h-[90px] px-3 py-2 border border-gray-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-[#7C3AED]"
          />
        </div>

        {/* Due date */}
        <div className="w-full flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Due date
          </label>

          <input
            id="name"
            type="date"
            placeholder="e.g. Website Redesign"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-slate-800 w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
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
