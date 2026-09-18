import { Link } from "react-router-dom";
import { Home, LogIn } from "lucide-react";
import AppFooter from "@/components/AppFooter";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 grid place-items-center px-5 py-12">
        <div className="study-panel max-w-md w-full p-7 md:p-9 text-center">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            The page you requested does not exist or is no longer available.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold">
              <Home className="w-4 h-4" aria-hidden="true" /> Go to StudyOS
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-semibold">
              <LogIn className="w-4 h-4" aria-hidden="true" /> Log in
            </Link>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}