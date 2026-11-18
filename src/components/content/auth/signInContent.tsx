import { AuthShell } from "@/components/layouts/authShell/authShell";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { AuthDivider } from "./authDivider";
import { SignInForm } from "./forms/signInForm";
import { GithubButton } from "./githubButton";
import { SignInPanel } from "./signInPanel";

export default function SignInContent() {
  return (
    <AuthShell tone="inverse" panel={<SignInPanel />}>
      <h1 className="text-5xl leading-none font-extrabold tracking-[-0.045em]">
        Welcome <Highlight>back</Highlight>
      </h1>
      <p className="mt-3.5 mb-8 text-fg-secondary">Sign in to get back to your boards.</p>

      <GithubButton />
      <AuthDivider label="or use your email" />
      <SignInForm />

      <p className="mt-6 text-center text-[15px] text-fg-secondary">
        New to Flowboard? <TextLink href="/register">Create an account</TextLink>
      </p>
    </AuthShell>
  );
}
