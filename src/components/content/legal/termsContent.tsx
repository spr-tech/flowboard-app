import Link from "next/link";

import { supportEmail } from "@/server/lib/supportEmail";
import { ContactEmail, LegalList, LegalPage, LegalSection } from "./legalPage";

/** /terms. Short and plain on purpose. */
export default function TermsContent() {
  const email = supportEmail();

  return (
    <LegalPage
      title="Terms of use"
      intro="These are the rules for using Flowboard. By creating an account or using the app, you agree to them."
    >
      <LegalSection title="Flowboard is free, and provided as it is">
        <p>
          Flowboard is free for now. We work to keep it running and your data safe, but we provide it &ldquo;as
          is&rdquo;, without guarantees: it may sometimes be unavailable, change, or have bugs. Keep your own copy of
          anything you can&apos;t afford to lose.
        </p>
      </LegalSection>

      <LegalSection title="Use it fairly">
        <p>Please don&apos;t:</p>
        <LegalList
          items={[
            "send spam, including through project invites;",
            "store or share anything illegal, or anything that infringes someone else's rights;",
            "try to break into, overload or attack the service, or other people's accounts;",
            "use Flowboard to harass or harm anyone.",
          ]}
        />
        <p>Accounts that do may be suspended or deleted.</p>
      </LegalSection>

      <LegalSection title="Your work is yours">
        <p>
          What you put into Flowboard belongs to you and your team. We use it only to run the service, as the{" "}
          <Link href="/privacy" className="font-semibold text-fg-link hover:text-fg-link-hover">
            privacy policy
          </Link>{" "}
          explains.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          Keep your sign-in details to yourself; you&apos;re responsible for what happens in your account. You can ask
          us to delete it at any time.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          If these terms change, we&apos;ll update the date at the top. Questions: <ContactEmail email={email} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
