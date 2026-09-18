import LegalLinks from "@/components/LegalLinks";

export default function AppFooter({ compact = false }) {
  return (
    <footer className={`text-muted-foreground ${compact ? "mt-6" : "border-t border-border px-5 py-5"}`}>
      <LegalLinks className="text-[11px]" />
      <p className="mt-2 text-center text-[10px] leading-relaxed">
        StudyOS is operated by an individual operator. Verified public operator and contact details will be added before launch.
      </p>
    </footer>
  );
}