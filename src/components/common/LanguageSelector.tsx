"use client";
import { useLanguage } from "@/context/LanguageContext";
import Select from "@/components/ui/Select";

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      options={[
        { value: "en", label: "English" },
        { value: "ta", label: "Tamil" },
        { value: "hi", label: "Hindi" },
        { value: "ml", label: "Malayalam" },
        { value: "te", label: "Telugu" },
        { value: "kn", label: "Kannada" },
        { value: "or", label: "Odia" },
      ]}
      variant="small"
      className="w-48 text-sm"
      aria-label="Select language"
    />
  );
};

export default LanguageSelector;