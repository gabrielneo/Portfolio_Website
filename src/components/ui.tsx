import type { ReactNode } from "react";
import { ArrowDown } from "lucide-react";

/** LinkedIn mark (lucide no longer ships brand icons). */
export function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-glass backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex cursor-default items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-sm text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/10 hover:text-white hover:shadow-glow">
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-soft">
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{children}</p>;
}

export function Takeaway({ lead, rest }: { lead: string; rest: string }) {
  return (
    <p data-reveal className="mt-2 text-sm font-semibold text-slate-300">
      Takeaway: <strong className="text-white">{lead}</strong>
      {rest}
    </p>
  );
}

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} data-reveal className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
      {children}
    </h2>
  );
}

/** "NEXT · Strengths · How I show up on teams ↓" link to the following section. */
export function SectionTease({ to, label, payoff }: { to: string; label: string; payoff: string }) {
  return (
    <a
      href={`#${to}`}
      data-reveal
      className="group mt-12 flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-slate-800/80 bg-slate-900/50 px-4 py-2 text-sm text-slate-300 backdrop-blur transition-colors hover:border-accent/40 hover:text-white"
    >
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Next</span>
      <span aria-hidden="true" className="text-slate-500">·</span>
      <span className="font-semibold text-white">{label}</span>
      <span className="hidden text-slate-400 sm:inline">{payoff}</span>
      <ArrowDown className="h-4 w-4 text-accent transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
    </a>
  );
}

export function Section({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 py-20 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
