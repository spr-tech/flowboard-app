import { AuthShell } from "@/components/layouts/authShell/authShell";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { AuthDivider } from "./authDivider";
import { SignUpForm } from "./forms/signUpForm";
import { GithubButton } from "./githubButton";
import { SignUpPanel } from "./signUpPanel";

export default function SignUpContent() {
  return (
    <AuthShell tone="primary" panel={<SignUpPanel />}>
      <h1 className="text-5xl leading-none font-extrabold tracking-[-0.045em]">
        Start your <Highlight>board</Highlight>
      </h1>
      <p className="mt-3.5 mb-7 text-fg-secondary">Free to use. No card needed.</p>

      <GithubButton />
      <AuthDivider label="or sign up with email" />
      <SignUpForm />

      {/* Plain text until there are Terms and Privacy pages to link to. */}
      <p className="mt-4 text-center text-[13px] leading-relaxed text-fg-muted">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
      <p className="mt-5 text-center text-[15px] text-fg-secondary">
        Already have an account? <TextLink href="/login">Sign in</TextLink>
      </p>
    </AuthShell>
  );
}
