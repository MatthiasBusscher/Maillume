import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  ExternalLink,
  KeyRound,
  MousePointerClick,
  PanelRightOpen,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizeHref } from "@/lib/i18n/site-locale";
import {
  BROWSER_EXTENSION_SOURCE_URL,
  BROWSER_EXTENSION_STORE_URL,
  getAppRouteHref,
} from "@/lib/site";

const copy = {
  en: {
    metadataDescription: "Add the official Maillume Chrome extension and check suspicious messages in Gmail or Outlook.",
    eyebrow: "Chrome extension · available now",
    title: "Check suspicious email where you already read it.",
    description: "Add Maillume from the Chrome Web Store and check messages in Gmail or Outlook without background mailbox scanning. You choose what is captured and when the analysis starts.",
    addToChrome: "Add to Chrome",
    installJump: "How to get started",
    statusLabel: "Current status",
    statusTitle: "Available in the Chrome Web Store",
    statusText: "The official extension has been approved and published. Chrome installs updates automatically for Store-installed extensions.",
    storeStatus: "Official listing",
    howEyebrow: "How it works",
    howTitle: "One explicit action for each message.",
    howDescription: "Maillume never watches your inbox. You decide when the extension may read the visible message and when its contents are sent for assessment.",
    howSteps: [
      { title: "Open and capture", text: "Open one message in Gmail or Outlook and click the Maillume toolbar icon. Selected text takes priority; otherwise Maillume reads the visibly open message when it can do so unambiguously." },
      { title: "Review the details", text: "Check the captured subject, sender, and message text in the side panel. You remain in control before anything is analyzed." },
      { title: "Analyze and act", text: "Start the analysis to receive the same explainable risk score, signals, and recommended next step as the web scanner." },
    ],
    installEyebrow: "Getting started",
    installTitle: "Connect the extension in four steps.",
    requirementsTitle: "Before you start",
    requirements: ["Chrome 116 or newer", "A Maillume account", "A revocable Maillume API key", "A Gmail or Outlook webmail account for message capture"],
    accountCta: "Open your Maillume account",
    installSteps: [
      { title: "Add Maillume to Chrome", text: "Open the official Chrome Web Store listing, choose Add to Chrome, and pin Maillume to the Chrome toolbar for easier access." },
      { title: "Create an API key", text: "Sign in to Maillume, open your account, and create a dedicated API key for the Chrome extension. Copy it when shown; Maillume displays the full key only once." },
      { title: "Open a message", text: "Open one message in Gmail or Outlook and click the Maillume icon to open the side panel." },
      { title: "Connect Maillume", text: "In Connection settings, keep https://app.maillume.io as the deployment and enter your API key. Leave Remember API key on this device enabled to keep it across restarts and updates, or disable it for session-only storage. Then choose Save connection." },
    ],
    useEyebrow: "Using the extension",
    useTitle: "Review every message before analysis.",
    useSteps: [
      "Open a message in Gmail or Outlook.",
      "Click the Maillume toolbar icon. Select text first if you only want to assess that selection.",
      "Use current message whenever you move to another email while the side panel remains open.",
      "Review the captured subject, sender, and message text.",
      "Choose Analyze message and use the explanation and next step to make your own decision.",
    ],
    privacyEyebrow: "Privacy and permissions",
    privacyTitle: "Temporary access, visible boundaries.",
    privacyItems: [
      { title: "No background scanning", text: "The extension acts only after you click it and does not crawl or monitor your mailbox." },
      { title: "No stored messages or results", text: "Captured message content and completed assessments are not written to extension storage or Maillume scan history." },
      { title: "Your key-storage choice", text: "Remembering the key stores it in trusted extension-local storage on this Chrome profile across restarts and updates. Turn remember off to keep it only for the browser session." },
      { title: "Deployment-specific permission", text: "Chrome asks for access only to the Maillume deployment you choose. Removing the connection also removes that access." },
    ],
    updatesEyebrow: "Updates and removal",
    updatesTitle: "Chrome handles updates automatically.",
    updatesText: "Store-installed extensions receive updates through Chrome. To disconnect, choose Remove connection in the side panel. You can remove the extension at any time from Chrome's extension settings, while the source remains public for inspection.",
    sourceCta: "Inspect the extension source",
    troubleshootingEyebrow: "Troubleshooting",
    troubleshootingTitle: "Two common setup messages.",
    troubleshootingItems: [
      { title: "Connection not configured", text: "Create a Maillume API key, open Connection settings, keep https://app.maillume.io as the deployment, paste the key, and save the connection." },
      { title: "More than one message is expanded", text: "Collapse the other message or select the exact text you want to assess before clicking Maillume again." },
    ],
    finalEyebrow: "Ready to check a message?",
    finalTitle: "Add Maillume to Chrome and keep suspicious email at arm's length.",
  },
  nl: {
    metadataDescription: "Voeg de officiële Maillume Chrome-extensie toe en controleer verdachte berichten in Gmail of Outlook.",
    eyebrow: "Chrome-extensie · nu beschikbaar",
    title: "Controleer verdachte e-mail waar je die al leest.",
    description: "Voeg Maillume toe vanuit de Chrome Web Store en controleer berichten in Gmail of Outlook zonder scans op de achtergrond. Jij kiest wat wordt vastgelegd en wanneer de analyse start.",
    addToChrome: "Toevoegen aan Chrome",
    installJump: "Zo ga je aan de slag",
    statusLabel: "Huidige status",
    statusTitle: "Beschikbaar in de Chrome Web Store",
    statusText: "De officiële extensie is goedgekeurd en gepubliceerd. Chrome installeert updates voor extensies uit de Store automatisch.",
    storeStatus: "Officiële vermelding",
    howEyebrow: "Zo werkt het",
    howTitle: "Eén uitdrukkelijke handeling per bericht.",
    howDescription: "Maillume houdt je inbox nooit in de gaten. Jij bepaalt wanneer de extensie het zichtbare bericht mag lezen en wanneer de inhoud voor beoordeling wordt verstuurd.",
    howSteps: [
      { title: "Openen en vastleggen", text: "Open één bericht in Gmail of Outlook en klik op het Maillume-pictogram in de werkbalk. Geselecteerde tekst krijgt voorrang; anders leest Maillume het zichtbaar geopende bericht wanneer dat ondubbelzinnig kan." },
      { title: "Gegevens controleren", text: "Controleer het vastgelegde onderwerp, de afzender en de berichttekst in het zijpaneel. Jij houdt de controle voordat de analyse begint." },
      { title: "Analyseren en handelen", text: "Start de analyse voor dezelfde uitlegbare risicoscore, signalen en aanbevolen vervolgstap als in de webscanner." },
    ],
    installEyebrow: "Aan de slag",
    installTitle: "Verbind de extensie in vier stappen.",
    requirementsTitle: "Dit heb je nodig",
    requirements: ["Chrome 116 of nieuwer", "Een Maillume-account", "Een intrekbare Maillume API-sleutel", "Een Gmail- of Outlook-webmailaccount om berichten vast te leggen"],
    accountCta: "Open je Maillume-account",
    installSteps: [
      { title: "Voeg Maillume toe aan Chrome", text: "Open de officiële vermelding in de Chrome Web Store, kies Toevoegen aan Chrome en zet Maillume vast in de Chrome-werkbalk voor eenvoudige toegang." },
      { title: "Maak een API-sleutel", text: "Log in bij Maillume, open je account en maak een aparte API-sleutel voor de Chrome-extensie. Kopieer de sleutel wanneer deze verschijnt; Maillume toont de volledige sleutel maar één keer." },
      { title: "Open een bericht", text: "Open één bericht in Gmail of Outlook en klik op het Maillume-pictogram om het zijpaneel te openen." },
      { title: "Verbind Maillume", text: "Laat bij Verbindingsinstellingen https://app.maillume.io als omgeving staan en voer je API-sleutel in. Laat API-sleutel op dit apparaat onthouden ingeschakeld voor behoud na herstarts en updates, of schakel het uit voor opslag alleen tijdens de sessie. Kies daarna Verbinding opslaan." },
    ],
    useEyebrow: "De extensie gebruiken",
    useTitle: "Controleer elk bericht vóór de analyse.",
    useSteps: [
      "Open een bericht in Gmail of Outlook.",
      "Klik op het Maillume-pictogram in de werkbalk. Selecteer eerst tekst als je alleen die selectie wilt beoordelen.",
      "Kies Huidig bericht gebruiken wanneer je naar een andere e-mail gaat terwijl het zijpaneel open blijft.",
      "Controleer het vastgelegde onderwerp, de afzender en de berichttekst.",
      "Kies Bericht analyseren en gebruik de uitleg en vervolgstap om zelf een beslissing te nemen.",
    ],
    privacyEyebrow: "Privacy en machtigingen",
    privacyTitle: "Tijdelijke toegang met zichtbare grenzen.",
    privacyItems: [
      { title: "Geen scans op de achtergrond", text: "De extensie komt alleen in actie nadat je erop klikt en doorzoekt of bewaakt je mailbox niet." },
      { title: "Geen opgeslagen berichten of resultaten", text: "Vastgelegde berichtinhoud en voltooide beoordelingen worden niet in extensieopslag of Maillume-scanhistorie geschreven." },
      { title: "Jouw keuze voor sleutelopslag", text: "Als je de sleutel laat onthouden, blijft deze in vertrouwde lokale extensieopslag van dit Chrome-profiel staan na herstarts en updates. Schakel onthouden uit om de sleutel alleen tijdens de browsersessie te bewaren." },
      { title: "Machtiging per omgeving", text: "Chrome vraagt alleen toegang tot de Maillume-omgeving die jij kiest. Als je de verbinding verwijdert, wordt die toegang ook verwijderd." },
    ],
    updatesEyebrow: "Bijwerken en verwijderen",
    updatesTitle: "Chrome verwerkt updates automatisch.",
    updatesText: "Extensies uit de Store ontvangen updates via Chrome. Kies Verbinding verwijderen in het zijpaneel als je wilt ontkoppelen. Je kunt de extensie altijd verwijderen via de extensie-instellingen van Chrome; de broncode blijft openbaar om te inspecteren.",
    sourceCta: "Bekijk de broncode van de extensie",
    troubleshootingEyebrow: "Problemen oplossen",
    troubleshootingTitle: "Twee veelvoorkomende meldingen bij het instellen.",
    troubleshootingItems: [
      { title: "Verbinding niet ingesteld", text: "Maak een Maillume API-sleutel, open Verbindingsinstellingen, laat https://app.maillume.io als omgeving staan, plak de sleutel en sla de verbinding op." },
      { title: "Er zijn meerdere berichten uitgeklapt", text: "Klap het andere bericht in of selecteer de exacte tekst die je wilt beoordelen voordat je opnieuw op Maillume klikt." },
    ],
    finalEyebrow: "Klaar om een bericht te controleren?",
    finalTitle: "Voeg Maillume toe aan Chrome en houd verdachte e-mail op afstand.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestSiteLocale();
  return { title: locale === "nl" ? "Chrome-extensie" : "Chrome extension", description: copy[locale].metadataDescription };
}

export default async function ChromeExtensionPage() {
  const locale = await getRequestSiteLocale();
  const text = copy[locale];
  const accountHref = localizeHref(getAppRouteHref("/account"), locale);

  return (
    <main className="min-h-screen bg-[#f7f8f4]">
      <SiteHeader />
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          <>
            <a href={BROWSER_EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 bg-[#dfff52] px-5 text-sm font-bold text-[#111711] hover:bg-white">
              {text.addToChrome} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#install" className="inline-flex h-12 items-center gap-2 border border-white/35 px-5 text-sm font-semibold text-white hover:border-white hover:bg-white/10">
              {text.installJump} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </>
        }
      />

      <section className="border-b border-[#cbd0c5] bg-[#e5f4ed]">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-5 py-7 sm:px-6 md:grid-cols-[150px_1fr_auto] md:items-center lg:px-8">
          <p className="font-mono text-[10px] uppercase text-[#087b72]">{text.statusLabel}</p>
          <div>
            <h2 className="font-semibold text-[#12483f]">{text.statusTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#32665d]">{text.statusText}</p>
          </div>
          <span className="w-fit border border-[#087b72] bg-white/60 px-3 py-2 font-mono text-[9px] uppercase text-[#087b72]">{text.storeStatus}</span>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#087b72]">{text.howEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">{text.howTitle}</h2>
              <p className="mt-5 text-base leading-7 text-[#59655a]">{text.howDescription}</p>
            </div>
            <div className="grid border-t border-[#aeb6ac] md:grid-cols-3 md:border-l md:border-t-0">
              {text.howSteps.map((step, index) => (
                <article key={step.title} className="border-b border-r border-[#cbd0c5] p-6 md:border-b-0">
                  <span className="font-mono text-[10px] text-[#087b72]">0{index + 1}</span>
                  <h3 className="mt-5 font-semibold text-[#111711]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#59655a]">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] py-20 sm:py-24" id="install">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#087b72]">{text.installEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">{text.installTitle}</h2>
            <div className="mt-8 border border-[#aeb6ac] bg-white p-5">
              <h3 className="font-semibold text-[#111711]">{text.requirementsTitle}</h3>
              <ul className="mt-4 space-y-3">
                {text.requirements.map((item) => <CheckItem key={item}>{item}</CheckItem>)}
              </ul>
              <a href={accountHref} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#087b72] hover:text-[#111711]">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> {text.accountCta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <ol className="border-t border-[#111711]">
            {text.installSteps.map((step, index) => (
              <InstructionStep key={step.title} number={`0${index + 1}`} title={step.title} text={step.text}>
                {index === 0 ? (
                  <a href={BROWSER_EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#087b72] hover:text-[#111711]">
                    {text.addToChrome} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
              </InstructionStep>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#087b72] py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#dfff52]">{text.useEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{text.useTitle}</h2>
          </div>
          <ol className="border-t border-white/35">
            {text.useSteps.map((step, index) => (
              <li key={step} className="grid grid-cols-[48px_1fr] gap-4 border-b border-white/25 py-4 text-sm leading-6 text-[#e1f0ed]">
                <span className="font-mono text-[10px] text-[#dfff52]">0{index + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] uppercase text-[#087b72]">{text.privacyEyebrow}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold text-[#111711] sm:text-4xl">{text.privacyTitle}</h2>
          <div className="mt-12 grid border-y border-[#aeb6ac] md:grid-cols-2 lg:grid-cols-4">
            {text.privacyItems.map((item, index) => {
              const Icon = [MousePointerClick, ShieldCheck, KeyRound, PanelRightOpen][index];
              return (
                <article key={item.title} className="border-b border-[#cbd0c5] py-7 md:px-6 lg:border-b-0 lg:border-r first:pl-0 last:border-r-0 last:pr-0">
                  <Icon className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-[#111711]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#59655a]">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[#cbd0c5] py-20">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <RefreshCw className="h-6 w-6 text-[#ff705f]" aria-hidden="true" />
            <p className="mt-5 font-mono text-[10px] uppercase text-[#087b72]">{text.updatesEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#111711]">{text.updatesTitle}</h2>
          </div>
          <div>
            <p className="text-base leading-7 text-[#59655a]">{text.updatesText}</p>
            <a href={BROWSER_EXTENSION_SOURCE_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#087b72] hover:text-[#111711]">
              {text.sourceCta} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-[#111711] bg-[#111711] py-20 text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#dfff52]">{text.troubleshootingEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold">{text.troubleshootingTitle}</h2>
          </div>
          <div className="border-t border-white/30">
            {text.troubleshootingItems.map((item, index) => (
              <article key={item.title} className="grid gap-3 border-b border-white/20 py-6 sm:grid-cols-[48px_0.45fr_1fr] sm:gap-5">
                <span className="font-mono text-[10px] text-[#dfff52]">0{index + 1}</span>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm leading-6 text-[#c8d1c6]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#dfff52]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase text-[#59655a]">{text.finalEyebrow}</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-[#111711]">{text.finalTitle}</h2>
          </div>
          <a href={BROWSER_EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 flex-none items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]">
            {text.addToChrome} <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-3 text-sm leading-6 text-[#4f5b50]"><Check className="mt-1 h-4 w-4 flex-none text-[#087b72]" aria-hidden="true" />{children}</li>;
}

function InstructionStep({ children, number, text, title }: { children?: React.ReactNode; number: string; text: string; title: string }) {
  return (
    <li className="grid grid-cols-[48px_1fr] gap-4 border-b border-[#cbd0c5] py-6">
      <span className="font-mono text-[10px] text-[#087b72]">{number}</span>
      <div>
        <h3 className="font-semibold text-[#111711]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#59655a]">{text}</p>
        {children}
      </div>
    </li>
  );
}
