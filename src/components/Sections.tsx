import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, Check, ChevronRight, Copy, ExternalLink, FileText, Mail, X } from "lucide-react";
import { CONTACT, EXPERIENCE, FOCUS, PROFILE, PROJECTS, STRENGTHS, VALUES, type Project } from "../portfolioData";
import { useOpenResume } from "./ResumeDialog";
import { GlassCard, LinkedInIcon, Pill, Section, SectionHeading, SectionLabel, SectionTease, Tag, Takeaway } from "./ui";

// ---- Focus ------------------------------------------------------------------
export function Focus() {
  return (
    <Section id="focus">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <SectionLabel>Focus</SectionLabel>
          <Takeaway {...FOCUS.takeaway} />
          <SectionHeading>{FOCUS.title}</SectionHeading>
          <p data-reveal className="mt-4 text-base leading-relaxed text-slate-300">
            <strong className="font-semibold text-white">{FOCUS.body.strong}</strong>
            {FOCUS.body.rest}
          </p>
          <ul data-reveal className="mt-6 flex flex-wrap gap-2" aria-label="Focus areas">
            {FOCUS.pills.map((pill) => (
              <li key={pill}>
                <Pill>{pill}</Pill>
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal className="lg:col-span-6">
          <GlassCard className="p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">{FOCUS.principle.title}</h3>
            <p className="mt-3 text-slate-300">
              <strong className="font-semibold text-white">{FOCUS.principle.strong}</strong>
              {FOCUS.principle.rest}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {FOCUS.principle.pillars.map((pillar) => (
                <div key={pillar.kicker} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-colors hover:border-accent/40">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{pillar.kicker}</p>
                  <p className="mt-1.5 text-sm font-medium text-white">{pillar.text}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
      <SectionTease to="strengths" label="Strengths" payoff="How I show up on teams" />
    </Section>
  );
}

// ---- Strengths --------------------------------------------------------------
export function Strengths() {
  return (
    <Section id="strengths">
      <div className="max-w-3xl">
        <SectionLabel>Strengths</SectionLabel>
        <Takeaway {...STRENGTHS.takeaway} />
        <SectionHeading>{STRENGTHS.title}</SectionHeading>
        <p data-reveal className="mt-4 text-base leading-relaxed text-slate-300">{STRENGTHS.body}</p>
      </div>
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {STRENGTHS.cards.map((card, i) => (
          <li key={card.title} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
            <GlassCard className="flex h-full flex-col p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow">
              <span className="text-xs font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{card.body}</p>
              <p className="mt-5 border-t border-slate-800/80 pt-3 text-xs font-medium text-slate-400">{card.proof}</p>
            </GlassCard>
          </li>
        ))}
      </ul>
      <SectionTease to="projects" label="Projects" payoff="AI product build, governance, ERP data, QA" />
    </Section>
  );
}

// ---- Projects ---------------------------------------------------------------
export function Projects() {
  const [open, setOpen] = useState<Project | null>(null);
  return (
    <Section id="projects">
      <SectionLabel>Projects</SectionLabel>
      <SectionHeading>Results at a glance</SectionHeading>
      <p data-reveal className="mt-3 text-slate-300">Tap a project for the full story.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {PROJECTS.map((project) => (
          <li key={project.id} data-reveal>
            <button
              type="button"
              onClick={() => setOpen(project)}
              aria-haspopup="dialog"
              className="group h-full w-full rounded-2xl text-left transition-transform active:scale-[0.99]"
            >
              <GlassCard className="flex h-full flex-col gap-3 p-5 transition-all group-hover:-translate-y-1 group-hover:border-accent/40 group-hover:shadow-glow">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{project.kicker}</span>
                    {project.live && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-strong/40 bg-accent-strong/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-soft">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" aria-hidden="true" />
                        Live
                      </span>
                    )}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-snug text-white">{project.title}</h3>
                <p className="text-sm font-medium text-accent-soft">{project.result}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {project.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </GlassCard>
            </button>
          </li>
        ))}
      </ul>
      <ProjectDialog project={open} onClose={() => setOpen(null)} />
      <SectionTease to="experience" label="Experience" payoff="Where these habits were built" />
    </Section>
  );
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      aria-labelledby="project-dialog-title"
      className="m-auto w-[min(44rem,calc(100vw-2rem))] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-0 text-slate-200 shadow-glow backdrop:bg-night/80 backdrop:backdrop-blur-sm"
    >
      {project && (
        <div className="max-h-[88vh] overflow-y-auto p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{project.kicker}</p>
              <h2 id="project-dialog-title" className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
                {project.title}
              </h2>
              <p className="mt-2 text-slate-300">{project.detail.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close project details"
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:border-accent/50 hover:text-white active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Links first, so they're visible without scrolling. */}
          {project.detail.links && (
            <div className="mt-4 flex flex-wrap gap-2">
              {project.detail.links.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    i === 0
                      ? "bg-accent text-night shadow-glow hover:-translate-y-0.5"
                      : "border border-slate-700/80 bg-slate-900/60 text-white hover:border-accent/50"
                  }`}
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailBlock title="Problem">
              <p>{project.detail.problem}</p>
            </DetailBlock>
            <DetailBlock title="My role">
              <p>{project.detail.role}</p>
            </DetailBlock>
            <DetailBlock title={project.detail.doneLabel}>
              <BulletList items={project.detail.done} />
            </DetailBlock>
            <DetailBlock title="Outcomes">
              <BulletList items={project.detail.outcomes} />
            </DetailBlock>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Tools">
            {project.detail.tools.map((tool) => (
              <Tag key={tool}>{tool}</Tag>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">
          {item}
        </li>
      ))}
    </ul>
  );
}

// ---- Experience -------------------------------------------------------------
export function Experience() {
  return (
    <Section id="experience">
      <SectionLabel>Experience</SectionLabel>
      <SectionHeading>Experience timeline</SectionHeading>
      <p data-reveal className="mt-3 text-slate-300">
        One line per role · <strong className="font-semibold text-white">Show details</strong> for the bullets.
      </p>
      <ol className="relative mt-10 grid gap-4 border-l border-slate-800 pl-6 sm:pl-8">
        {EXPERIENCE.map((job) => (
          <TimelineItem key={job.org} job={job} />
        ))}
      </ol>
      <SectionTease to="values" label="Values" payoff="Why healthtech & social impact" />
    </Section>
  );
}

function TimelineItem({ job }: { job: (typeof EXPERIENCE)[number] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li data-reveal className="relative">
      <span aria-hidden="true" className="absolute -left-[31px] top-6 h-3 w-3 rounded-full border-2 border-accent bg-night shadow-glow sm:-left-[39px]" />
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className="text-base font-semibold text-white">
            {job.role} •{" "}
            <a href={job.orgUrl} target="_blank" rel="noopener noreferrer" className="text-accent-soft underline-offset-4 hover:underline">
              {job.org}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </h3>
          <span className="flex-shrink-0 text-sm text-slate-400">{job.dates}</span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          <strong className="font-semibold text-white">{job.headline.strong}</strong>
          {job.headline.rest}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 px-3 py-1 text-sm font-medium text-slate-200 transition-all hover:border-accent/50 hover:text-white hover:shadow-glow active:scale-95"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
          {open ? "Hide details" : "Show details"}
        </button>
        {/* Animated open/close via grid rows. Collapsed content is hidden from
            screen readers too, so they only hear it once it's shown. */}
        <div
          id={panelId}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          aria-hidden={!open}
        >
          <div className="overflow-hidden">
            <ul className="mt-4 grid gap-2 text-sm text-slate-300">
              {job.details.map((detail) => (
                <li key={detail} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>
    </li>
  );
}

// ---- Values + Contact -------------------------------------------------------
export function ValuesContact() {
  const openResume = useOpenResume();
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${PROFILE.email}`;
    }
  };

  return (
    <Section id="values" className="pb-12">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <SectionLabel>Values</SectionLabel>
          <SectionHeading>{VALUES.title}</SectionHeading>
          <p data-reveal className="mt-4 text-slate-300">
            {VALUES.body.pre}
            <strong className="font-semibold text-white">{VALUES.body.a}</strong>
            {VALUES.body.mid}
            <strong className="font-semibold text-white">{VALUES.body.b}</strong>
            {VALUES.body.post}
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {VALUES.cards.map((card) => (
            <li key={card.title} data-reveal>
              <GlassCard className="h-full p-5 transition-colors hover:border-accent/40">
                <h3 className="font-semibold text-white">{card.title}</h3>
                <p className="mt-1.5 text-sm text-slate-300">{card.body}</p>
              </GlassCard>
            </li>
          ))}
        </ul>
      </div>

      <div id="contact" className="mt-16 scroll-mt-24">
        <GlassCard className="p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <SectionLabel>Contact</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">{CONTACT.title}</h2>
              <p className="mt-3 max-w-xl text-slate-300">{CONTACT.body}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-night shadow-glow transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email me
                </a>
                <a
                  href={PROFILE.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-accent/50 hover:shadow-glow active:scale-95"
                >
                  <LinkedInIcon className="h-4 w-4" />
                  LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <button
                  type="button"
                  onClick={openResume}
                  aria-haspopup="dialog"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-accent/50 hover:shadow-glow active:scale-95"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Resume
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm lg:col-span-5" aria-label="Contact details">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Email</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2">
                <a href={`mailto:${PROFILE.email}`} className="break-all font-medium text-accent-soft underline-offset-4 hover:underline">
                  {PROFILE.email}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 px-2.5 py-0.5 text-xs font-medium text-slate-200 transition-all hover:border-accent/50 active:scale-95"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <span className="sr-only" aria-live="polite">{copied ? "Email address copied" : ""}</span>
              </dd>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Mobile</dt>
              <dd className="text-slate-200">{PROFILE.mobile}</dd>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Location</dt>
              <dd className="text-slate-200">{PROFILE.location}</dd>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</dt>
              <dd>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-strong/40 bg-accent-strong/10 px-2.5 py-0.5 text-xs font-semibold text-accent-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" aria-hidden="true" />
                  {PROFILE.status}
                </span>
              </dd>
            </dl>
          </div>
        </GlassCard>
      </div>
    </Section>
  );
}

// ---- Footer + back to top ---------------------------------------------------
export function Footer() {
  return (
    <footer className="border-t border-slate-800/70 py-10 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} {PROFILE.name}. Built with React, Three.js and Tailwind CSS.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a className="hover:text-white" href="#contact">Contact</a>
          <a className="hover:text-white" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a className="hover:text-white" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <a
      href="#top"
      aria-label="Back to top"
      className={`fixed bottom-5 right-5 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-100 shadow-glass backdrop-blur transition-all hover:border-accent/50 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      tabIndex={show ? 0 : -1}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
