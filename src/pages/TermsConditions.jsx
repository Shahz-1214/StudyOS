import LegalPolicyPage from "@/components/LegalPolicyPage";
import { termsPolicy } from "@/lib/legalContent";

export default function TermsConditions() {
  return <LegalPolicyPage policy={termsPolicy} />;
}