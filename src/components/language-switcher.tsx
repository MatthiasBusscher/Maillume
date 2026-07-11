import { Globe2 } from "lucide-react";

import { type Dictionary, type Locale, supportedLocales } from "@/lib/i18n/dictionary";

type LanguageSwitcherProps = {
  dictionary: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function LanguageSwitcher({
  dictionary,
  locale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      className="flex items-center gap-2"
      aria-label={dictionary.language.label}
    >
      <Globe2 className="h-4 w-4 text-[#aeb6bf]" aria-hidden="true" />
      <div className="inline-flex border border-white/25 bg-[#0f1114] p-1">
        {supportedLocales.map((option) => {
          const isActive = option.locale === locale;

          return (
            <button
              key={option.locale}
              type="button"
              onClick={() => onLocaleChange(option.locale)}
              className={`h-8 min-w-10 px-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-[#dfff52] text-[#111711]"
                  : "text-[#c8ced4] hover:bg-white/10 hover:text-white"
              }`}
              aria-pressed={isActive}
              title={option.label}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
