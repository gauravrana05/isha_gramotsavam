import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LanguageCode, DEFAULT_LANGUAGE, isValidLanguageCode } from "@/lib/utils/i18n-server";

// Define SegmentParams to match your route's params
interface SegmentParams {
  lang: LanguageCode;
}

// Use the LayoutProps interface compatible with node_modules
interface LayoutProps {
  children: ReactNode;
  params: Promise<SegmentParams>;
}

export default async function LangLayout({ children, params }: LayoutProps) {
  // Await the params Promise to get the actual object
  const { lang } = await params;
  
  // Validate language parameter
  if (!isValidLanguageCode(lang)) {
    // Warning removed
    redirect(`/${DEFAULT_LANGUAGE}`);
  }

  // Console log removed
  
  // Note: We don&apos;t set document.lang here as this runs server-side
  // The lang attribute will be set in the root layout
  
  return <>{children}</>;
}

export async function generateStaticParams(): Promise<{ lang: LanguageCode }[]> {
  // Console log removed
  return [
    { lang: "en" },
    { lang: "ta" },
    { lang: "hi" },
    { lang: "ml" },
    { lang: "te" },
    { lang: "kn" },
    { lang: "or" },
  ];
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  // Await the params Promise
  const { lang } = await params;
  // Console log removed
  const resolvedLang = (lang ?? "en") as LanguageCode;

  const translations: Record<LanguageCode, { title: string; description: string }> = {
    en: { title: "Isha Gramotsavam", description: "Annual Rural Sports Festival Management Platform" },
    ta: { title: "இஷா கிராமோத்சவம்", description: "ஆண்டு கிராம விளையாட்டு விழா மேலாண்மை தளம்" },
    hi: { title: "इशा ग्रामोत्सव", description: "वार्षिक ग्रामीण खेल उत्सव प्रबंधन मंच" },
    ml: { title: "ഇഷ ഗ്രാമോത്സവം", description: "വാർഷിക ഗ്രാമീണ കായിക ഉത്സവ മാനേജ്മെന്റ് പ്ലാറ്റ്ഫോം" },
    te: { title: "ఇషా గ్రామోత్సవం", description: "వార్షిక గ్రామీణ క్రీడల ఉత్సవ నిర్వహణ వేదిక" },
    kn: { title: "ಇಷಾ ಗ್ರಾಮೋತ್ಸವ", description: "ವಾರ್ಷಿಕ ಗ್ರಾಮೀಣ ಕ್ರೀಡಾ ಉತ್ಸವ ನಿರ್ವಹಣಾ ವೇದಿಕೆ" },
    or: { title: "ଇଶା ଗ୍ରାମୋତ୍ସବ", description: "ବାର୍ଷିକ ଗ୍ରାମୋତ୍ସବ କ୍ରୀଡ଼ା ଉତ୍ସବ ପରିଚାଳନା" },
  };

  return {
    title: translations[resolvedLang]?.title || translations.en.title,
    description: translations[resolvedLang]?.description || translations.en.description,
    manifest: "/manifest.json",
  };
}