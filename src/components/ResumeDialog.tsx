import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { PROFILE } from "../portfolioData";

// In-page resume preview. Any "Resume" button calls openResume(); the Google
// viewer (a third-party embed) only loads once the dialog is opened.
const ResumeContext = createContext<() => void>(() => {});
export const useOpenResume = () => useContext(ResumeContext);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const open = () => {
    setOpened(true);
    ref.current?.showModal();
  };

  // Keep the page behind still while the preview is open.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => (document.body.style.overflow = "");
    const onOpen = () => (document.body.style.overflow = "hidden");
    const observer = new MutationObserver(() => (dialog.open ? onOpen() : onClose()));
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, []);

  return (
    <ResumeContext.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        aria-labelledby="resume-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto h-[min(92vh,60rem)] w-[min(56rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-0 text-slate-200 shadow-glow"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3.5">
            <h2 id="resume-title" className="text-base font-semibold text-white">
              {PROFILE.name} · Resume
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={PROFILE.resumePdf}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-night transition-transform active:scale-95"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </a>
              <a
                href={PROFILE.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:border-accent/50 active:scale-95"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in Google Docs<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Close resume"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-200 hover:border-accent/50 hover:text-white active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="relative flex-1 bg-white">
            {opened && (
              <>
                {!loaded && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading resume…
                  </div>
                )}
                <iframe
                  src={PROFILE.resumePreview}
                  title={`${PROFILE.name}'s resume`}
                  onLoad={() => setLoaded(true)}
                  className="h-full w-full border-0"
                />
              </>
            )}
          </div>
        </div>
      </dialog>
    </ResumeContext.Provider>
  );
}
