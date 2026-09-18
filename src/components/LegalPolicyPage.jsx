import { Link } from "react-router-dom";
import AppFooter from "@/components/AppFooter";
import { POLICY_UPDATED } from "@/lib/legalContent";

export default function LegalPolicyPage({ policy }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60">
        <div className="max-w-[820px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-display font-bold text-[15px]">StudyOS</Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </header>
      <main className="max-w-[820px] mx-auto px-5 py-8 md:py-12">
        <p className="eyebrow">Legal information</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold">{policy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{policy.summary}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">Last updated: {POLICY_UPDATED}</p>
        <div className="mt-8 space-y-7">
          {policy.sections.map((section) => (
            <section key={section.heading} aria-labelledby={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
              <h2 id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="text-lg font-bold">{section.heading}</h2>
              <div className="mt-2 space-y-2 text-[13px] md:text-sm text-muted-foreground leading-6">
                {section.paragraphs.map((text) => <p key={text}>{text}</p>)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}