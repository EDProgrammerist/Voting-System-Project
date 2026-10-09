import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-blue-700">404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
        Page not found
      </h1>
      <p className="mt-4 text-slate-600">
        The page you requested does not exist or may have moved.
      </p>
      <Link
        className="mt-8 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        to="/"
      >
        Return home
      </Link>
    </section>
  );
}

