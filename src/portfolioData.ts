// ---------------------------------------------------------------------------
// All page copy lives here, so updating the portfolio never means touching
// layout code. Wording carried over from the previous static site.
// ---------------------------------------------------------------------------

export const PROFILE = {
  name: "Neo Yi Kai",
  subtitle: "BA / PM • Healthtech • Social impact",
  email: "neoyikai3@gmail.com",
  mobile: "+65 8660 5097",
  location: "Singapore",
  status: "Open to opportunities",
  linkedin: "https://www.linkedin.com/in/neo-yi-kai/",
  resume:
    "https://docs.google.com/document/d/1f-cBuO7EeRGkGYEXADQ0GE0NOvRGuuAa/edit?usp=sharing&ouid=100361167613814497616&rtpof=true&sd=true",
  // In-page preview and PDF download of the same Google Docs resume.
  resumePreview: "https://drive.google.com/file/d/1f-cBuO7EeRGkGYEXADQ0GE0NOvRGuuAa/preview",
  resumePdf: "https://docs.google.com/document/d/1f-cBuO7EeRGkGYEXADQ0GE0NOvRGuuAa/export?format=pdf",
  github: "https://github.com/gabrielneo",
};

export const NAV = [
  { id: "focus", label: "Focus" },
  { id: "strengths", label: "Strengths" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "values", label: "Values" },
  { id: "contact", label: "Contact", cta: true },
] as const;

export const HERO = {
  badge: "Outcome-led BA/PM for health and public services",
  chips: ["Business Analyst (BA)", "Project Manager (PM)", "Healthtech", "Nonprofit / Social Impact", "Digital transformation"],
  headline: "I turn messy service needs into clear requirements, aligned teams, and measurable delivery outcomes.",
  intro: { strong: "Healthtech & social impact", rest: ": calm delivery, clear decisions, measurable outcomes." },
  glance: {
    summary: { strong: "BA/PM", rest: ": scope, risks, and cadence recruiters can verify in one pass." },
    rows: [
      { label: "Fit", strong: "Discovery → delivery", rest: " · alignment · governance" },
      { label: "Sectors", strong: "Health", rest: " · public services · impact orgs" },
      { label: "Edge", strong: "Requirements", rest: " · workflows · QA" },
      { label: "Base", strong: "Singapore", rest: " · hybrid-friendly" },
    ],
  },
};

export const FOCUS = {
  takeaway: { lead: "Fewer handoff failures", rest: " between frontline ops and delivery." },
  title: "What I optimise for",
  body: { strong: "Reliable, equitable services", rest: " in health and mission-driven work, with constraints visible early, not buried at go-live." },
  pills: ["Stakeholder alignment", "Requirements", "Workflow improvement", "Service design", "Delivery cadence", "Cross-functional teams"],
  principle: {
    title: "Operating principle",
    strong: "Make the next step obvious",
    rest: " for users, staff, and systems. Clarity cuts rework, anxiety, and meeting load.",
    pillars: [
      { kicker: "People", text: "Trust & access by design" },
      { kicker: "Process", text: "Less friction at handoffs" },
      { kicker: "Product", text: "Maintainable, fit for purpose" },
    ],
  },
};

export const STRENGTHS = {
  takeaway: { lead: "One shared picture", rest: " of scope, risk, and what “done” means." },
  title: "How I show up on delivery teams",
  body: "I sit between frontline ops and engineering so trade-offs are explicit, not discovered late.",
  cards: [
    {
      title: "Requirements & scope",
      body: "User stories, acceptance criteria and MoSCoW prioritisation, so sprint planning debates shrink.",
      proof: "Proof: JIRA hygiene · traceable scope",
    },
    {
      title: "Workflow improvement",
      body: "As-is / to-be flows that cut rework and duplicate capture at handoffs.",
      proof: "Proof: service mapping · quick wins",
    },
    {
      title: "Delivery coordination",
      body: "Cadence, visible risk tracking and light governance, so teams align without meeting sprawl.",
      proof: "Proof: governance · reporting rhythm",
    },
  ],
};

export interface Project {
  id: string;
  kicker: string;
  title: string;
  /** One-line headline result shown on the card. */
  result: string;
  /** Shows a "Live" badge on the card; the link itself lives in detail.links. */
  live?: boolean;
  tags: string[];
  detail: {
    desc: string;
    problem: string;
    role: string;
    doneLabel: string;
    done: string[];
    outcomes: string[];
    tools: string[];
    links?: { label: string; href: string }[];
  };
}

export const PROJECTS: Project[] = [
  {
    id: "fieldnotes",
    kicker: "Personal build",
    title: "Fieldnotes: saved food videos → a map of places",
    result: "AI web app I scoped, designed, built and shipped solo",
    live: true,
    tags: ["Next.js", "TypeScript", "AI APIs"],
    detail: {
      desc: "A web app that reads the captions of saved Instagram Reels and TikToks and writes up every place they mention: what to order, price, tips, and a pin on your own map.",
      problem:
        "Food videos get saved and forgotten. Turning a saved folder into a plan means rewatching every video just to catch a name and an address.",
      role: "Solo builder: product idea, scope, UX and UI, full-stack engineering, security, and documentation.",
      doneLabel: "What I built",
      done: [
        "Pipeline: Apify fetches Instagram and TikTok captions, an AI model extracts every place mentioned, and a strict schema checks each result.",
        "Works with any AI provider (Claude, ChatGPT, Gemini, a free local model, and more), switched by one setting.",
        "Google Places lookup with a Google My Maps import file, plus Excel export.",
        "A 2-minute guided demo that runs without any keys, a WCAG AA notebook-style interface, and a scroll-driven 3D landing page.",
      ],
      outcomes: [
        "Secure by design: keys live only in a local settings file that's checked at startup, never in the browser or the repo.",
        "Automated guardrails: a secret-scanning pre-commit hook plus GitHub Actions for secret and dependency scanning.",
        "Plain-English error messages that tell users what to fix instead of raw API codes.",
        "Live on Vercel: the public site runs the keyless demo only, so visitors can try it without ever spending API credit.",
        "Open source (MIT), with a README written for non-technical users.",
      ],
      tools: [
        "Next.js 16", "React 19", "TypeScript", "Vercel", "Tailwind CSS", "Zod", "Claude / OpenAI-compatible APIs",
        "Apify", "Google Places API", "React Three Fiber", "GSAP", "GitHub Actions", "Gitleaks",
      ],
      links: [
        { label: "Try the live demo", href: "https://insta-tiktok-reels-collating.vercel.app/" },
        { label: "View the code on GitHub", href: "https://github.com/gabrielneo/Insta-Tiktok-Reels-collating" },
      ],
    },
  },
  {
    id: "hmgics-governance",
    kicker: "Digital transformation",
    title: "Governance + KPI reporting",
    result: "Faster exec decisions across workstreams",
    tags: ["JIRA", "Power BI", "Governance"],
    detail: {
      desc: "JIRA delivery health + Power BI KPI dashboards to keep exec decisions fast and teams aligned.",
      problem: "Parallel workstreams needed one clear view of milestones, risks, and KPIs for leadership decisions.",
      role: "PM intern: governance cadence, cross-team coordination, exec-ready reporting (JIRA).",
      doneLabel: "What I improved",
      done: ["Maintained milestones, risks, and delivery health in JIRA.", "Built Power BI KPI dashboards and decision-ready updates."],
      outcomes: ["Faster leadership decisions with clearer progress signals.", "Stronger cadence and shared situational awareness."],
      tools: ["JIRA", "Power BI", "Program governance", "KPI dashboards", "Stakeholder coordination", "SDLC awareness"],
    },
  },
  {
    id: "d365-migration",
    kicker: "ERP delivery",
    title: "Dynamics 365 data migration",
    result: "99% accuracy · −30% post-go-live issues",
    tags: ["Dynamics 365", "Data migration", "Docs"],
    detail: {
      desc: "Requirements + migration validation to keep ERP onboarding accurate and low-risk.",
      problem: "Small data issues or unclear requirements often surface after go-live as rework and support burden.",
      role: "Associate consultant intern: requirements, migration checks, and clear documentation.",
      doneLabel: "What I improved",
      done: ["Validated migration datasets (Excel) for accuracy.", "Documented decisions, risks, and fixes for traceability."],
      outcomes: ["99% data accuracy; -30% post-deployment issues.", "Milestones met through coordination and documentation discipline."],
      tools: ["Dynamics 365 Business Central", "Excel", "Requirements gathering", "Data migration", "Functional documentation", "Risk management"],
    },
  },
  {
    id: "outsystems-qa",
    kicker: "Public sector QA",
    title: "QA + Selenium test automation",
    result: "−40% manual test time",
    tags: ["OutSystems", "Selenium", "QA"],
    detail: {
      desc: "Structured QA + Selenium automation to reduce regression effort and improve signal quality.",
      problem: "Manual regression repeats every release; teams need repeatable coverage without ballooning effort.",
      role: "BA intern (QA): test execution, clear defect notes, Selenium automation.",
      doneLabel: "What I improved",
      done: ["Executed 50+ test cases on OutSystems sites.", "Built Selenium scripts to automate repeat checks."],
      outcomes: ["-40% manual testing time; faster, more consistent defect signal.", "Clearer, repeatable evidence for release confidence."],
      tools: ["OutSystems", "Selenium", "Test cases", "QA documentation", "Defect triage", "UX feedback"],
    },
  },
];

export const EXPERIENCE = [
  {
    role: "Project Management Intern",
    org: "Hyundai Motor Group Innovation Center Singapore (HMGICS)",
    orgUrl: "https://www.hyundai.com/sg/hmgics/about-us",
    dates: "Jan 2026 – Jun 2026",
    headline: { strong: "Governance + JIRA health", rest: " for a digital transformation program: milestones, risks, and exec-ready visibility." },
    details: [
      "Tracked delivery health, milestones, and risks across workstreams using JIRA.",
      "Built executive dashboards in Power BI and KPI updates to speed up leadership decisions.",
      "Improved reporting cadence and documentation quality by applying SDLC and planning discipline.",
    ],
  },
  {
    role: "Associate Consultant Intern",
    org: "J&P Consulting Pte Ltd",
    orgUrl: "https://www.jnpconsulting.com.sg/",
    dates: "May 2025 – Aug 2025",
    headline: { strong: "D365 BC onboarding", rest: ": requirements + migration validation; 99% data accuracy." },
    details: [
      "Supported data migration using Excel, maintaining 99% data accuracy during onboarding.",
      "Collaborated with internal and external teams to deliver tailored ERP solutions ahead of schedule.",
      "Prepared functional/technical documentation and proactively resolved risks/bugs, reducing post-deployment issues by 30%.",
    ],
  },
  {
    role: "Business Analyst Intern",
    org: "Jurong Town Corporation (JTC)",
    orgUrl: "https://www.jtc.gov.sg/",
    dates: "Sep 2020 – Feb 2021",
    headline: { strong: "OutSystems QA", rest: ": 50+ cases + Selenium; -40% manual regression time." },
    details: [
      "Executed 50+ performance and functional test cases on OutSystems-based corporate websites.",
      "Identified issues and proposed actionable UX and functionality improvements.",
      "Built Selenium automation scripts, reducing manual testing time by 40%.",
    ],
  },
];

export const VALUES = {
  title: "Why healthtech / social impact",
  body: { pre: "Mission-driven work is where ", a: "stakeholder trust", mid: " and ", b: "operational rigour", post: " have to coexist." },
  cards: [
    { title: "Trust", body: "Protect sensitive data; earn confidence through predictable delivery." },
    { title: "Equity", body: "Design for real constraints: language, access, time, and stress." },
    { title: "Sustainability", body: "Prefer maintainable processes over brittle heroics." },
    { title: "Outcomes", body: "Measure time-to-serve, errors avoided, and experience quality." },
  ],
};

export const CONTACT = {
  title: "Get in touch",
  body: "Open to BA / PM roles in health and public services. Email is best; I typically reply within 24 hours.",
};
