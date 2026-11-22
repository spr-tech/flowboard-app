"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { Input } from "@/components/ui/input/input";
import { toast } from "@/components/ui/toast/toast";
import type { MeResponse } from "@/models/responses/meResponses";
import { updateMeSchema, type UpdateMeValues } from "@/models/validations/authValidation";
import { useUpdateMeMutation } from "@/services/accountService";
import { applyApiError } from "@/utilities/helpers/applyApiError";

/** Name (Save enabled only when it changed) and the read-only email with its note. */
export function ProfileForm({ me }: { me: MeResponse }) {
  const router = useRouter();
  const [updateMe] = useUpdateMeMutation();
  const savedName = me.name ?? "";
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<UpdateMeValues>({ resolver: zodResolver(updateMeSchema), defaultValues: { name: savedName } });
  const name = useWatch({ control, name: "name" });
  const isChanged = name.trim() !== savedName;

  const onSubmit = async (values: UpdateMeValues) => {
    try {
      const saved = await updateMe(values).unwrap();
      reset({ name: saved.name ?? "" });
      toast({ type: "success", message: "Name updated" });
      // The top bar's name is rendered on the server from the session; this redraws it.
      router.refresh();
    } catch (error) {
      applyApiError(error, ["name"], setError);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={savedName || me.email} imageUrl={me.image} size="lg" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{savedName || "No name yet"}</span>
          <span className="block truncate text-sm text-fg-muted">{me.email}</span>
        </span>
      </div>
      <FormInput control={control} name="name" label="Full name" autoComplete="name" />
      <Input
        label="Email"
        value={me.email}
        readOnly
        helperText="Your email is used for sign-in and invites, so it can't be changed here."
        className="bg-surface-sunken text-fg-secondary"
      />
      <div className="flex justify-end gap-2">
        <Button text="Cancel" variant="ghost" disabled={!isChanged} onClick={() => reset({ name: savedName })} />
        <Button text="Save changes" type="submit" disabled={!isChanged} isLoading={isSubmitting} />
      </div>
    </form>
  );
}
