import LegalPolicyPage from "@/components/LegalPolicyPage";
import { privacyPolicy } from "@/lib/legalContent";

export default function PrivacyPolicy() {
  return <LegalPolicyPage policy={privacyPolicy} />;
}