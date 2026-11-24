"use client";

import { LogOut, Monitor } from "lucide-react";

import type { SignInMethod } from "@/models/auth/signInMethod";
import { SettingsSection } from "@/components/content/projects/settings/settingsSection";
import { Button } from "@/components/ui/button/button";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton/skeleton";
import { useMe } from "@/services/accountService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";
import { ChangePasswordForm } from "./forms/changePasswordForm";
import { ProfileForm } from "./forms/profileForm";

const SECTIONS = {
  profile: {
    id: "account-profile",
    title: "Profile",
    description: "This is how teammates see you on boards, in invites and in the activity feed.",
  },
  password: {
    id: "account-password",
    title: "Password",
    description: "Changing your password signs you out on every other device.",
  },
  session: { id: "account-session", title: "Session", description: "Sign out of Flowboard on this device." },
} as const;

const METHOD_LABELS: Record<SignInMethod, string> = {
  password: "email and password",
  github: "GitHub",
  google: "Google",
};

/** /settings (docs/designs/app-screens.md, "Account settings"): Profile, Password, Session. */
export default function SettingsContent({ signInMethod }: { signInMethod?: SignInMethod }) {
  const dispatch = useAppDispatch();
  const { data: me, isLoading } = useMe();
  const showSkeleton = useDelayedFlag(isLoading);

  const header = (
    <header>
      <h1 className="text-3xl font-extrabold tracking-tight">Account settings</h1>
      <p className="mt-1 text-fg-secondary">
        Your profile and how you sign in. Project settings live inside each project.
      </p>
    </header>
  );

  if (!me) {
    return (
      <SkeletonScreen label="Loading your account" className="mx-auto flex max-w-5xl flex-col gap-8">
        {header}
        {showSkeleton && [0, 1, 2].map((section) => <Skeleton key={section} className="h-44 rounded-card-lg" />)}
      </SkeletonScreen>
    );
  }

  // Sessions from before the method was recorded fall back to what the account allows.
  const method: SignInMethod = signInMethod ?? (me.hasPassword ? "password" : "github");
  // An account without a password signs in with Google or GitHub; name the one in use.
  const oauthName = method === "google" ? "Google" : "GitHub";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {header}

      <SettingsSection {...SECTIONS.profile}>
        <ProfileForm key={me.name ?? ""} me={me} />
      </SettingsSection>

      <SettingsSection {...SECTIONS.password}>
        {me.hasPassword ? (
          <ChangePasswordForm me={me} />
        ) : (
          <div>
            <p className="font-semibold">You sign in with {oauthName}</p>
            <p className="text-sm text-fg-secondary">
              There&apos;s no Flowboard password on this account. Manage your sign-in security on {oauthName}.
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection {...SECTIONS.session}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <Monitor aria-hidden className="size-5 text-fg-muted" />
            <span>
              <span className="block font-semibold">Signed in with {METHOD_LABELS[method]}</span>
              <span className="block text-sm text-fg-muted">This browser</span>
            </span>
          </span>
          <Button
            text="Sign out"
            variant="outline"
            startIcon={<LogOut aria-hidden />}
            className="border-danger text-danger hover:bg-danger/10"
            onClick={() => dispatch(dialogOpened({ kind: "signOut" }))}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
