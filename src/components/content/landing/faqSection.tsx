import { Accordion, type AccordionEntry } from "@/components/ui/accordion/accordion";
import { Reveal } from "@/components/ui/reveal/reveal";

const faqs: AccordionEntry[] = [
  {
    id: "free",
    title: "Is Flowboard free?",
    content: "Yes. Make an account and start a board. There is nothing to pay.",
  },
  {
    id: "github",
    title: "Can I sign in with GitHub?",
    content: "Yes. Use GitHub in one click, or sign up with an email and password.",
  },
  {
    id: "join",
    title: "How do teammates join a project?",
    content: "The project owner invites them by email. They follow the link and join as members.",
  },
  {
    id: "priority",
    title: "Can I set task priorities?",
    content: "Every task can be low, medium or high, and the label shows on its card.",
  },
  {
    id: "phone",
    title: "Does it work on my phone?",
    content: "Yes. Flowboard works in any modern browser, on desktop and on your phone.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-surface-inverse px-6 pb-28">
      <div className="mx-auto max-w-220 rounded-[32px] bg-surface-page p-[clamp(28px,5vw,56px)]">
        <Reveal as="h2" effect="rise" className="mb-8 text-display-faq leading-none font-extrabold tracking-[-0.04em]">
          Questions, answered
        </Reveal>
        {/* staggerDepth 2: the questions live inside the Accordion root, one level down. */}
        <Reveal effect="rise" delay={120} stagger={80} staggerDepth={2}>
          <Accordion items={faqs} defaultOpenId={faqs[0].id} />
        </Reveal>
      </div>
    </section>
  );
}
