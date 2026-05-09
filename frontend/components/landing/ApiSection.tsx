export function ApiSection() {
  return (
    <section
      id="api"
      className="relative mx-auto w-full max-w-[900px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="rounded-[30px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-slate-500">
          [ API ]
        </p>
        <p className="mt-3 font-mono text-sm text-white">
          POST /api/v1/recommendations
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300/85">
          The Next app serializes the form, calls the endpoint from the browser, and renders the JSON response — no ranking logic in the frontend bundle.
        </p>
      </div>
    </section>
  );
}
