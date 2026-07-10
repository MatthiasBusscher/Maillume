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
      <Globe2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
      <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
        {supportedLocales.map((option) => {
          const isActive = option.locale === locale;

          return (
            <button
              key={option.locale}
              type="button"
              onClick={() => onLocaleChange(option.locale)}
              className={`h-8 min-w-10 rounded px-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
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
