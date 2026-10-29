import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { NAV, PROFILE } from "../portfolioData";
import { useActiveSection, useScrollProgress } from "../hooks/usePageEffects";

const NAV_IDS = NAV.map((item) => item.id);

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(NAV_IDS);
  const progress = useScrollProgress();

  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Mobile overlay: Esc closes it, the page behind can't scroll, and focus
  // moves to the first link when it opens.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const linkClass = (id: string, cta?: boolean) =>
    cta
      ? "rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent-soft transition-colors hover:bg-accent/20 hover:text-white"
      : `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          active === id ? "bg-slate-800/90 text-white shadow-glow" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
        }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-night/75 backdrop-blur-lg">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3 rounded-xl" aria-label={`${PROFILE.name}, back to top`}>
          <img
            src={`${import.meta.env.BASE_URL}avatar.jpg`}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 flex-shrink-0 rounded-xl object-cover ring-1 ring-accent/40"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{PROFILE.name}</span>
            <span className="block truncate text-xs text-slate-400">{PROFILE.subtitle}</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? "location" : undefined}
                className={linkClass(item.id, "cta" in item && item.cta)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="relative z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/70 text-slate-100 transition-transform active:scale-95 md:hidden"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>

      {/* Full-screen mobile overlay, rendered into <body>: the header's backdrop blur
          would otherwise become its containing block and squash it to header height.
          Stays mounted so it can fade/slide; inert while closed. */}
      {createPortal(
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`fixed inset-x-0 bottom-0 top-[4.25rem] z-40 bg-night/95 backdrop-blur-xl transition-[opacity,transform] duration-300 ease-out md:hidden ${
          menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <ul className="mx-auto grid max-w-md gap-2 px-6 pt-8">
          {NAV.map((item, i) => (
            <li
              key={item.id}
              className={`transition-[opacity,transform] duration-300 ease-out ${menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
              style={{ transitionDelay: menuOpen ? `${60 + i * 35}ms` : "0ms" }}
            >
              <a
                ref={i === 0 ? firstLinkRef : undefined}
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={active === item.id ? "location" : undefined}
                className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-lg font-semibold transition-colors active:scale-[0.98] ${
                  active === item.id
                    ? "border-accent/40 bg-accent/10 text-white"
                    : "border-slate-800/80 bg-slate-900/60 text-slate-100 hover:border-accent/40"
                }`}
              >
                {item.label}
                <span aria-hidden="true" className="text-accent">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>,
      document.body
      )}

      {/* Reading progress */}
      <div aria-hidden="true" className="h-0.5 w-full bg-transparent">
        <div
          className="h-full origin-left bg-gradient-to-r from-accent-strong to-accent-cyan"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}
