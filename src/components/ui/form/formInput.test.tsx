import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { FormInput } from "./formInput";

const schema = z.object({ email: z.email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

/** A one-field form, validating on every change like our real forms do after the first submit. */
function TestForm() {
  const { control, handleSubmit } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(() => undefined)} noValidate>
      <FormInput control={control} name="email" label="Email" />
      <input aria-label="Next field" />
      <button type="submit">Submit</button>
    </form>
  );
}

const ERROR = "Enter a valid email address";

describe("FormInput", () => {
  it("doesn't show an error while the field is still being typed in", async () => {
    render(<TestForm />);
    const email = screen.getByLabelText("Email");

    await userEvent.type(email, "not-an-email");

    expect(screen.queryByText(ERROR)).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error once the field has been left", async () => {
    render(<TestForm />);
    const email = screen.getByLabelText("Email");

    await userEvent.type(email, "not-an-email");
    await userEvent.click(screen.getByLabelText("Next field"));

    expect(await screen.findByText(ERROR)).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the error on an untouched field once the form is submitted", async () => {
    render(<TestForm />);

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(ERROR)).toBeInTheDocument();
  });

  it("clears the error once the value is fixed", async () => {
    render(<TestForm />);
    const email = screen.getByLabelText("Email");

    await userEvent.type(email, "ada");
    await userEvent.tab();
    expect(await screen.findByText(ERROR)).toBeInTheDocument();

    await userEvent.type(email, "@example.com");
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument();
  });
});
