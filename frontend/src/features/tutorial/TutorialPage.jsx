import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileUp, Network, Quote, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";

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
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <PageHeader
          title="How StudyMind works"
          description="Four steps from a PDF to answers you can verify."
          actions={
            <Button asChild>
              <Link to="/library">
                Upload material
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="flex gap-4 p-5">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="tabular flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span className="w-px flex-1 bg-border" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <step.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  <p className="mt-2 rounded-md bg-surface-sunk px-3 py-2 text-xs text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Common questions</h2>
          </div>
          <dl className="divide-y divide-border">
            {FAQ.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <dt className="text-sm font-medium text-foreground">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link to="/study">
              <BookOpen aria-hidden="true" />
              Start studying
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3">
            <Link to="/mind-maps">
              <Network aria-hidden="true" />
              Build a mind map
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
