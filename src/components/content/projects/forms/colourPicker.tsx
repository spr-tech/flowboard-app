"use client";

import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import { PROJECT_COLOURS } from "@/utilities/enums/projectColours";
import { cn } from "@/utilities/helpers/cn";

type ColourPickerProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  name: Path<TValues>;
  disabled?: boolean;
};

/**
 * The 8 project colours as a radio group. Real radio inputs (visually hidden) under the swatches,
 * so arrow keys, Tab and screen readers behave as for any radio group without extra code.
 */
export function ColourPicker<TValues extends FieldValues>({ control, name, disabled }: ColourPickerProps<TValues>) {
  const {
    field: { value, onChange, onBlur },
  } = useController({ control, name });

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold">Colour</legend>
      <div className="flex flex-wrap gap-2.5">
        {PROJECT_COLOURS.map((colour) => (
          <label key={colour} className="relative cursor-pointer has-disabled:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={colour}
              checked={value === colour}
              onChange={() => onChange(colour)}
              onBlur={onBlur}
              className="peer sr-only"
            />
            <span className="sr-only">{PROJECT_COLOUR_STYLES[colour].label}</span>
            <span
              aria-hidden
              className={cn(
                "block size-10 rounded-xl outline-offset-[3px] peer-checked:outline-[3px] peer-checked:outline-fg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-focus peer-disabled:opacity-50",
                PROJECT_COLOUR_STYLES[colour].fill
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
