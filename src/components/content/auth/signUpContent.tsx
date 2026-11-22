import { AuthShell } from "@/components/layouts/authShell/authShell";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { AuthDivider } from "./authDivider";
import { SignUpForm } from "./forms/signUpForm";
import { GithubButton } from "./githubButton";
import { SignUpPanel } from "./signUpPanel";

export type SignUpContentProps = {
  /** From ?callbackUrl=: where to go once the account exists. */
  callbackUrl?: string;
  /** From ?invite=: the invite link this sign-up came from (its email is locked). */
  inviteToken?: string;
};

export default function SignUpContent({ callbackUrl, inviteToken }: SignUpContentProps) {
  const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  return (
    <AuthShell tone="brandDeep" panel={<SignUpPanel />}>
      <h1 className="text-5xl leading-none font-extrabold tracking-[-0.045em]">
        Start your <Highlight>board</Highlight>
      </h1>
      <p className="mt-3.5 mb-7 text-fg-secondary">Free to use. No card needed.</p>

      <GithubButton callbackUrl={callbackUrl} />
      <AuthDivider label="or sign up with email" />
      <SignUpForm callbackUrl={callbackUrl} inviteToken={inviteToken} />

      {/* Plain text until there are Terms and Privacy pages to link to. */}
      <p className="mt-4 text-center text-[13px] leading-relaxed text-fg-muted">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
      <p className="mt-5 text-center text-[15px] text-fg-secondary">
        Already have an account? <TextLink href={loginHref}>Sign in</TextLink>
      </p>
    </AuthShell>
  );
}
