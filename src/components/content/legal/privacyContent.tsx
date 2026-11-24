import { supportEmail } from "@/server/lib/supportEmail";
import { ContactEmail, LegalList, LegalPage, LegalSection } from "./legalPage";

const Strong = ({ children }: { children: string }) => <strong className="text-fg-primary">{children}</strong>;

/** /privacy. Plain English, written from what the code actually stores (prisma/schema.prisma). */
export default function PrivacyContent() {
  const email = supportEmail();

  return (
    <LegalPage
      title="Privacy policy"
      intro="Flowboard is a Kanban board for small teams. This page explains, in plain English, what we keep about you, why, who helps us run the service, and how to have your account deleted."
    >
      <LegalSection title="What we store">
        <LegalList
          items={[
            <>
              <Strong>Your account:</Strong> your name, your email address, your profile picture if you signed in with
              Google or GitHub, and whether and when you confirmed your email.
            </>,
            <>
              <Strong>Your password, if you set one:</Strong> only a one-way hash of it (bcrypt). Nobody, including us,
              can read your password from it.
            </>,
            <>
              <Strong>What you create:</Strong> projects, columns, tasks and their notes, who is in each project, and a
              history of changes in each project (who moved or edited what, and when).
            </>,
            <>
              <Strong>Invites:</Strong> the email address you invite, who sent the invite, and when it expires.
            </>,
            <>
              <Strong>Sign-in safety records:</Strong> failed password sign-ins (the email typed and the time), kept for
              about 15 minutes to stop people guessing passwords. Email confirmation codes, password-reset links and
              invite links are stored only as hashes, and they expire.
            </>,
          ]}
        />
        <p>
          We don&apos;t store your IP address in our database, and we don&apos;t use analytics, advertising or tracking
          tools.
        </p>
      </LegalSection>

      <LegalSection title="Signing in with Google or GitHub">
        <p>
          If you choose &ldquo;Continue with Google&rdquo; or &ldquo;Continue with GitHub&rdquo;, they share only your
          name, your email address and your profile picture with us. We also keep the record that links your Google or
          GitHub account to your Flowboard account, so you can sign in again. We don&apos;t read your email, contacts,
          files or code, and we never post anything for you.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and your browser">
        <p>
          We use only the cookies signing in needs: one that keeps you signed in, and short-lived ones that protect the
          sign-in steps. Your browser also remembers which board columns you collapsed; that stays on your device.
        </p>
      </LegalSection>

      <LegalSection title="Who helps us run Flowboard">
        <LegalList
          items={[
            <>
              <Strong>Neon</Strong> stores our database (PostgreSQL), in Frankfurt, Germany.
            </>,
            <>
              <Strong>Vercel</Strong> hosts the app. Like any web host, it keeps short-lived request logs, which include
              IP addresses, to run and protect the service.
            </>,
            <>
              <Strong>Gmail</Strong> (Google) sends our emails: confirmation codes, password resets and invites.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="What we never do">
        <p>
          We don&apos;t sell your data, share it with advertisers, or use it for ads. We use it only to run Flowboard
          for you and your team.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your work">
        <p>
          Everything in a project is visible to that project&apos;s members. People outside a project can&apos;t see it,
          or even tell that it exists.
        </p>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          To have your account and your data deleted, email <ContactEmail email={email} /> from the address you sign in
          with. Projects you share with others stay with the rest of the team unless you ask us to delete them too.
        </p>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <p>
          If this policy changes, we&apos;ll update the date at the top. Questions are welcome at{" "}
          <ContactEmail email={email} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
