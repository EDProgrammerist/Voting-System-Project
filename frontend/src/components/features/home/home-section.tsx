import { useDocumentTitle } from "@/hooks/use-document-title";

const FEATURES = [
  {
    title: "Secure ballots",
    description: "Each eligible voter can submit one protected ballot per election.",
  },
  {
    title: "Clear choices",
    description: "Review candidates by position before making a final selection.",
  },
  {
    title: "Reliable results",
    description: "Election activity and outcomes are managed from one system.",
  },
];

export function HomeSection() {
  useDocumentTitle("Student Voting System");

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-blue-50 to-transparent" />
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            Your voice matters
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            A simple, secure way to take part in student elections.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Sign in with your student account, review the ballot, and cast your
            vote with confidence.
          </p>
          <p className="mt-8 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
            Frontend foundation ready
          </p>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              key={feature.title}
            >
              <h2 className="text-lg font-semibold text-slate-950">{feature.title}</h2>
              <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
