import LegalPolicyPage from "@/components/LegalPolicyPage";
import { cookiePolicy } from "@/lib/legalContent";

export default function CookiePolicy() {
  return <LegalPolicyPage policy={cookiePolicy} />;
}