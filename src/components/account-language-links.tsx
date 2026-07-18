import type { SiteLocale } from "@/lib/i18n/site-locale";

export function AccountLanguageLinks({
  locale,
  mutationToken,
}: {
  locale: SiteLocale;
  mutationToken?: string;
}) {
  const languageLabel = locale === "nl" ? "Taal" : "Language";

  return (
    <form action="/account/language" method="post" className="inline-flex border border-[#aeb6ac] bg-white p-1" aria-label={languageLabel}>
      {mutationToken ? <input type="hidden" name="csrf" value={mutationToken} /> : null}
      {(["en", "nl"] as const).map((option) => (
        <button
          key={option}
          type="submit"
          name="locale"
          value={option}
          className={`flex h-8 min-w-9 items-center justify-center px-2 text-xs font-semibold ${option === locale ? "bg-[#111711] text-white" : "text-[#434c43] hover:bg-[#e9ede6]"}`}
          aria-current={option === locale ? "true" : undefined}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
