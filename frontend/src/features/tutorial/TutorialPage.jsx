import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileUp, Network, Quote, Search } from "lucide-react";

import { Marquee, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageHeader } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";
import { pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";

import TutorialSteps from "./TutorialSteps";

const STEPS = [
  {
    icon: FileUp,
    title: "Upload your material",
    body:
      "Drop a PDF or Word document into the Library. It is parsed, split into passages, and " +
      "embedded into a search index that belongs only to your account.",
    detail: "PDF and DOCX, up to 50MB each. Scanned PDFs need OCR first — there is no text to read.",
  },
  {
    icon: Search,
    title: "Ask a question",
    body:
      "Your question is matched against the passages in your material, and the most relevant " +
      "ones are handed to the model as evidence. Pick specific documents to narrow the search.",
    detail: "Answer length changes how much evidence is retrieved, not just how long the reply is.",
  },
  {
    icon: Quote,
    title: "Check the citations",
    body:
      "Every answer lists the passages it used, naming the document and page. Click one to read " +
      "the exact text the answer was built from.",
    detail: "The model is instructed to say when your material does not cover something, rather than invent an answer.",
  },
  {
    icon: Network,
    title: "Build a mind map",
    body:
      "Turn a document, a chapter or a single topic into a branching diagram you can revise " +
      "from. Maps are saved automatically and can be exported as PNG, PDF or JSON.",
    detail: "Chapter and topic scopes read the document outline first, so the map stays focused.",
  },
];

const FAQ = [
  {
    q: "Can other people see my documents?",
    a: "No. Documents, indexes, chats and mind maps are stored against your account and every request is scoped to you.",
  },
  {
    q: "Why does a document say Failed?",
    a: "Most often the PDF is a scan with no extractable text. The Library shows the reason and a Retry button.",
  },
  {
    q: "What do the stages mean while an answer generates?",
    a: "They are the real steps the server is taking — preparing the question, searching, ranking passages, generating, and preparing citations. Each stage appears when the server starts that step, and the previous stage is marked done at that point.",
  },
  {
    q: "Does deleting one document rebuild everything?",
    a: "No. Only that document's passages are removed from the index; the rest stay as they are.",
  },
];

export default function TutorialPage() {
  const scrollRef = useRef(null);
  const m = useReducedMotionSafe();
  const { isAuthenticated } = useAuth();

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <motion.div variants={m.variants(pageEnter)} initial={m.initial} animate="show">
          <motion.div variants={m.variants(riseIn)}>
            <PageHeader
              as={isAuthenticated ? "h2" : "h1"}
              number={5}
              eyebrow="Guide"
              title="How StudyMind"
              emphasis="works"
              description="Four steps from a PDF to answers you can verify."
              titleClassName="lg:text-[4rem]"
              actions={
                <Button asChild>
                  <Link to="/library">
                    Upload material
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              }
              marginalia={
                <div className="relative hairline-t pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  <p className="eyebrow mb-1.5 text-foreground">Reading time</p>
                  About two minutes. The stages and notes below describe what the app actually does.
                  <Sticker tone="citron" rotate={-5} className="absolute -top-4 right-0">
                    4 steps
                  </Sticker>
                </div>
              }
            />
          </motion.div>
        </motion.div>
      </div>

      <Marquee
        items={["Upload", "Ask", "Check the citations", "Map it out", "Receipts included"]}
        speed={32}
        tilt={-1.5}
      />

      <div className="mx-auto max-w-6xl space-y-20 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <TutorialSteps steps={STEPS} scrollRef={scrollRef} />

        <motion.section
          aria-labelledby="faq-heading"
          variants={m.variants(pageEnter)}
          initial={m.initial}
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          <motion.div variants={m.variants(riseIn)} className="lg:col-span-4">
            <Eyebrow>Q &amp; A</Eyebrow>
            <h2 id="faq-heading" className="display mt-3 text-display-sm text-foreground">
              Common questions
            </h2>
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
              Straight answers about privacy, failed uploads and what happens while you wait.
            </p>
          </motion.div>
          <dl className="border-t-2 border-border-strong lg:col-span-8">
            {FAQ.map((item, index) => (
              <motion.div
                key={item.q}
                variants={m.variants(riseIn)}
                className="grid grid-cols-1 gap-2 border-b border-border py-6 sm:grid-cols-12 sm:gap-6"
              >
                <dt className="sm:col-span-5">
                  <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                    Q.{String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1.5 block font-display text-xl font-semibold leading-snug tracking-[-0.01em] text-foreground">
                    {item.q}
                  </span>
                </dt>
                <dd className="text-[15px] leading-relaxed text-muted-foreground sm:col-span-7 sm:pt-6">
                  {item.a}
                </dd>
              </motion.div>
            ))}
          </dl>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <Button asChild variant="secondary" size="lg" className="h-auto justify-between py-4 sm:col-span-7">
            <Link to="/study">
              <span className="flex items-center gap-2.5">
                <BookOpen aria-hidden="true" />
                Start studying
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-auto justify-between py-4 sm:col-span-5 sm:mt-6">
            <Link to="/mind-maps">
              <span className="flex items-center gap-2.5">
                <Network aria-hidden="true" />
                Build a mind map
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
