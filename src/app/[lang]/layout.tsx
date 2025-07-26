type LanguageCode = "en" | "ta" | "hi" | "ml" | "te" | "kn" | "or";

export async function generateStaticParams() {
  console.log("Generating static params for [lang]");
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

export async function generateMetadata({ params }: { params: { lang: LanguageCode } }) {
  console.log("Generating metadata for lang:", params.lang);
  const lang = params.lang || "en";
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
    title: translations[lang]?.title || translations.en.title,
    description: translations[lang]?.description || translations.en.description,
    manifest: "/manifest.json",
  };
}

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: LanguageCode };
}) {
  console.log("Rendering [lang]/layout.tsx for", params.lang);
  return <>{children}</>;
}