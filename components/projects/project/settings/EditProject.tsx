"use client";

import { useProject } from "@/context/ProjectProvider";
import { useRef, useState } from "react";
import { editProject } from "@/app/actions/projects";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWatch } from "react-hook-form";
import {
  editProjectSchema,
  EditProjectFormValues,
} from "@/lib/validations/project";

export default function EditProject() {
  const { currentProject } = useProject();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),

    defaultValues: {
      name: currentProject?.name ?? "",
      description: currentProject?.description ?? "",
      color: currentProject?.color ?? "#7C3AED",
      dueDate: currentProject?.dueDate
        ? new Date(currentProject.dueDate).toISOString().split("T")[0]
        : null,
    },
  });
  const color = useWatch({
    control,
    name: "color",
  });
  const [error, setError] = useState<string | null>("");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (data: EditProjectFormValues) => {
    if (!currentProject) return;
    setError(null);

    try {
      const result = await editProject({
        id: currentProject.id,
        name: data.name,
        description: data.description,
        color: data.color,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      });

      if (result.success) {
        toast.success("Project updated successfully");
      } else {
        // Handles expected errors returned by action from backend
        setError(result?.error ?? "Unable update project");
      }
    } catch (err) {
      // Handles unexpected network or server crashes
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-[#111827]">Edit Project</h2>

        <p className="mt-1 text-sm text-[#6B7280]">
          Update your project&apos;s information.
        </p>
      </div>

      {/* Form */}
      <form className="p-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Project Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            placeholder="Website Redesign"
            className="w-full h-11  text-slate-600 px-4 rounded-xl border border-gray-300 outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
          {errors.name && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.name.message}</p>
          )}{" "}
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
            {...register("description")}
            placeholder="Describe this project..."
            className="w-full min-h-35  text-slate-500 px-4 py-3 rounded-xl border border-gray-300 resize-none outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
          {errors.description && (
            <p className="text-xs text-[#EF4444] mt-1">
              {errors.description.message}
            </p>
          )}
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
              onChange={(e) => {
                setValue("color", e.target.value);
              }}
              className="hidden"
            />

            <input
              type="text"
              value={color}
              className="flex-1 text-gray-700 bg-transparent outline-none"
              onChange={(e) => setValue("color", e.target.value)}
            />
          </div>

          {errors.color && (
            <p className="text-xs text-[#EF4444] mt-1">
              {errors.color.message}
            </p>
          )}
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
            {...register("dueDate")}
            className="text-slate-500 w-full h-11 px-4 rounded-xl border border-gray-300 outline-none transition
            focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
          />
        </div>

        {error && (
          <p className="items-center justify-center mt-2 mb-2 text-base text-red-600">
            {error}
          </p>
        )}

        {/* Footer */}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="px-6 font-medium text-white transition bg-purple-600 h-11 rounded-xl hover:bg-purple-700 active:[0.98]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
