import { Link } from "react-router-dom";

const LINKS = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Cookies & storage", "/cookies"],
];

export default function LegalLinks({ className = "" }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap justify-center gap-x-4 gap-y-2 ${className}`}>
      {LINKS.map(([label, to]) => (
        <Link key={to} to={to} className="hover:text-foreground hover:underline underline-offset-4">
          {label}
        </Link>
      ))}
    </nav>
  );
}