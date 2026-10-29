import BackgroundCanvas from "./components/BackgroundCanvas";
import Header from "./components/Header";
import Hero from "./components/Hero";
import { BackToTop, Experience, Focus, Footer, Projects, Strengths, ValuesContact } from "./components/Sections";
import { useScrollReveal } from "./hooks/usePageEffects";
import CursorTrail from "./components/CursorTrail";
import { ResumeProvider } from "./components/ResumeDialog";

export default function App() {
  useScrollReveal();
  return (
    <ResumeProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-night"
      >
        Skip to main content
      </a>
      <BackgroundCanvas />
      <Header />
      <main id="main">
        <Hero />
        <Focus />
        <Strengths />
        <Projects />
        <Experience />
        <ValuesContact />
      </main>
      <Footer />
      <BackToTop />
      <CursorTrail />
    </ResumeProvider>
  );
}
