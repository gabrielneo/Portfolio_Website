import { ArrowDown, FileText, Mail } from "lucide-react";
import { HERO, PROFILE } from "../portfolioData";
import { GlassCard } from "./ui";
import { useOpenResume } from "./ResumeDialog";

export default function Hero() {
  const openResume = useOpenResume();
  return (
    <section id="top" className="relative flex min-h-[calc(100svh-4.5rem)] items-center py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8">
        <div className="lg:col-span-7">
          <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-strong opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-strong" />
            </span>
            {HERO.badge}
          </p>

          <ul data-reveal className="mt-5 flex flex-wrap gap-2" aria-label="Roles and sectors">
            {HERO.chips.map((chip, i) => (
              <li
                key={chip}
                className={`rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 ${
                  i > 2 ? "hidden sm:block" : ""
                }`}
              >
                {chip}
              </li>
            ))}
          </ul>

          <p data-reveal className="mt-5 text-sm text-slate-300">
            <span className="font-semibold text-white">{PROFILE.name}</span>
            <span aria-hidden="true" className="mx-2 text-slate-500">•</span>
            Business Analyst / Project Manager
          </p>

          <h1
            data-reveal
            className="mt-3 text-balance text-[clamp(2rem,1.3rem+2.6vw,3.6rem)] font-bold leading-[1.1] tracking-tight text-white"
          >
            {HERO.headline}
          </h1>
          <p data-reveal className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            <strong className="font-semibold text-white">{HERO.intro.strong}</strong>
            {HERO.intro.rest}
          </p>

          <div data-reveal className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openResume}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-night shadow-glow transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Resume
            </button>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:border-accent/50 hover:shadow-glow active:scale-95"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact
            </a>
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-accent-soft hover:text-white"
            >
              View projects
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <aside data-reveal className="lg:col-span-5" aria-labelledby="glance-title">
          <GlassCard className="p-6 sm:p-7">
            <h2 id="glance-title" className="text-base font-semibold text-white">
              At a glance
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              <strong className="font-semibold text-white">{HERO.glance.summary.strong}</strong>
              {HERO.glance.summary.rest}
            </p>
            <dl className="mt-5 grid gap-2.5">
              {HERO.glance.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5 text-sm">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{row.label}</dt>
                  <dd className="text-slate-300">
                    <strong className="font-semibold text-white">{row.strong}</strong>
                    {row.rest}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
              <span className="font-semibold text-white">Connect:</span>
              <a className="font-medium text-accent-soft underline-offset-4 hover:underline" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <a className="font-medium text-accent-soft underline-offset-4 hover:underline" href={`mailto:${PROFILE.email}`}>
                Email
              </a>
            </p>
          </GlassCard>
        </aside>
      </div>
    </section>
  );
}
