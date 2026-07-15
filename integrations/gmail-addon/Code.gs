var MAILLUME_ENDPOINT = "https://app.maillume.io";
var MAILLUME_ACCOUNT_URL = "https://app.maillume.io/account";
var MAILLUME_LOGO_URL = "https://maillume.io/integration-icons/icon-80.png";
var MAILLUME_API_KEY_PROPERTY = "MAILLUME_API_KEY";

function buildHomeCard(e) {
  var apiKey = getStoredApiKey();
  var nl = getLocale(e) === "nl";
  var connected = Boolean(apiKey);
  var connectionText = connected
    ? (nl ? "<b>Verbonden</b><br>Actieve sleutel " : "<b>Connected</b><br>Active key ") + escapeHtml(formatApiKeyPrefix(apiKey))
    : (nl ? "<b>Niet verbonden</b><br>Voeg een Maillume API-sleutel toe om berichten te analyseren." : "<b>Not connected</b><br>Add a Maillume API key to analyze messages.");

  var connectionSection = CardService.newCardSection()
    .setHeader(nl ? "Verbinding" : "Connection")
    .addWidget(
      CardService.newDecoratedText()
        .setTopLabel(nl ? "STATUS" : "STATUS")
        .setText(connectionText)
        .setWrapText(true),
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("apiKey")
        .setTitle(connected ? (nl ? "API-sleutel vervangen" : "Replace API key") : (nl ? "Maillume API-sleutel" : "Maillume API key"))
        .setHint(connected ? (nl ? "Plak alleen een nieuwe sleutel om de huidige te vervangen" : "Paste a new key only to replace the current one") : "mlm_..."),
    );

  var connectionButtons = CardService.newButtonSet().addButton(
    CardService.newTextButton()
      .setText(connected ? (nl ? "Sleutel vervangen" : "Replace key") : (nl ? "Sleutel opslaan" : "Save key"))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName("saveApiKey")),
  );
  if (connected) {
    connectionButtons.addButton(
      CardService.newTextButton()
        .setText(nl ? "Verwijderen" : "Remove")
        .setOnClickAction(CardService.newAction().setFunctionName("removeApiKey")),
    );
  }
  connectionSection.addWidget(connectionButtons);

  return CardService.newCardBuilder()
    .setHeader(buildBrandHeader(nl ? "Veilige controle van het geopende bericht" : "A safer check for the message you opened"))
    .addSection(connectionSection)
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "Privacy voorop" : "Private by design")
        .addWidget(
          CardService.newTextParagraph().setText(
            nl
              ? "Alleen uw API-sleutel wordt voor uw Google-account bewaard. Maillume leest pas een bericht nadat u <b>Dit bericht analyseren</b> kiest. Berichtinhoud en resultaten worden niet door de add-on opgeslagen."
              : "Only your API key is saved for your Google account. Maillume reads a message only after you choose <b>Analyze this message</b>. Message content and results are not stored by the add-on.",
          ),
        ),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "API-sleutel nodig?" : "Need an API key?")
        .addWidget(
          CardService.newTextButton()
            .setText(nl ? "Open Maillume-account" : "Open Maillume account")
            .setOpenLink(CardService.newOpenLink().setUrl(MAILLUME_ACCOUNT_URL)),
        ),
    )
    .build();
}

function buildMessageCard(e) {
  var nl = getLocale(e) === "nl";
  var apiKey = getStoredApiKey();
  var configured = Boolean(apiKey);
  var actionSection = CardService.newCardSection()
    .setHeader(nl ? "Geopend bericht" : "Open message")
    .addWidget(
      CardService.newDecoratedText()
        .setTopLabel(nl ? "VERBINDING" : "CONNECTION")
        .setText(configured
          ? (nl ? "<b>Klaar voor analyse</b><br>" : "<b>Ready to analyze</b><br>") + escapeHtml(formatApiKeyPrefix(apiKey))
          : (nl ? "<b>API-sleutel vereist</b><br>Verbind eerst uw Maillume-account." : "<b>API key required</b><br>Connect your Maillume account first."))
        .setWrapText(true),
    );

  if (configured) {
    actionSection.addWidget(
      CardService.newTextButton()
        .setText(nl ? "Dit bericht analyseren" : "Analyze this message")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName("analyzeCurrentMessage")),
    );
  } else {
    actionSection.addWidget(
      CardService.newTextButton()
        .setText(nl ? "API-sleutel instellen" : "Set up API key")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName("openConnectionSettings")),
    );
  }

  return CardService.newCardBuilder()
    .setHeader(buildBrandHeader(nl ? "Controleer voordat u klikt of antwoordt" : "Check before you click or reply"))
    .addSection(actionSection)
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "Wat wordt gedeeld?" : "What is shared?")
        .addWidget(
          CardService.newTextParagraph().setText(
            nl
              ? "Pas na uw klik stuurt de add-on de afzender, het onderwerp en de tekst van alleen dit geopende bericht naar Maillume. De add-on slaat het bericht en het resultaat niet op."
              : "Only after your click, the add-on sends the sender, subject, and text of this open message to Maillume. The add-on does not store the message or result.",
          ),
        ),
    )
    .build();
}

function openConnectionSettings(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildHomeCard(e)))
    .build();
}

function saveApiKey(e) {
  var nl = getLocale(e) === "nl";
  var key = getFormString(e, "apiKey").trim();
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(key)) {
    return notification(nl ? "Voer een geldige Maillume API-sleutel in." : "Enter a valid Maillume API key.");
  }

  try {
    PropertiesService.getUserProperties().setProperty(MAILLUME_API_KEY_PROPERTY, key);
  } catch (error) {
    return notification(nl ? "De API-sleutel kon niet worden opgeslagen. Probeer het opnieuw." : "The API key could not be saved. Please try again.");
  }

  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText(
        nl
          ? "API-sleutel opgeslagen. Deze blijft staan tot u hem verwijdert of Maillume hem afwijst."
          : "API key saved. It remains until you remove it or Maillume rejects it.",
      ),
    )
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function removeApiKey(e) {
  clearStoredApiKey();
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(getLocale(e) === "nl" ? "API-sleutel verwijderd." : "API key removed."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(e)))
    .build();
}

function analyzeCurrentMessage(e) {
  var locale = getLocale(e);
  var apiKey = getStoredApiKey();
  if (!apiKey) {
    return notification(locale === "nl" ? "Stel eerst een Maillume API-sleutel in." : "Set up a Maillume API key first.");
  }

  var message;
  try {
    GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
    message = GmailApp.getMessageById(e.gmail.messageId);
  } catch (error) {
    return notification(locale === "nl" ? "Gmail kon het geopende bericht niet lezen." : "Gmail could not read the open message.");
  }
  var payload = {
    source: "paste",
    subject: message.getSubject().slice(0, 300),
    senderEmail: message.getFrom().slice(0, 320),
    body: message.getPlainBody().slice(0, 20000),
    locale: locale
  };

  var response;
  try {
    response = UrlFetchApp.fetch(MAILLUME_ENDPOINT + "/api/v1/analyze", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    return notification(locale === "nl" ? "Maillume is tijdelijk niet bereikbaar. Probeer het later opnieuw." : "Maillume is temporarily unreachable. Please try again later.");
  }

  var status = response.getResponseCode();
  if (status === 401) {
    clearStoredApiKey();
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          locale === "nl"
            ? "De API-sleutel is verlopen of niet meer geldig en is verwijderd. Voeg een nieuwe sleutel toe."
            : "The API key expired or is no longer valid and was removed. Add a new key.",
        ),
      )
      .setNavigation(CardService.newNavigation().updateCard(buildMessageCard(e)))
      .build();
  }
  if (status === 403) {
    return notification(locale === "nl" ? "De aanvraag werd geweigerd. Controleer de verbinding of probeer het later opnieuw." : "The request was denied. Check the connection or try again later.");
  }
  if (status === 429) {
    return notification(locale === "nl" ? "De aanvraag is beperkt. Controleer uw gebruik of wacht voordat u het opnieuw probeert." : "The request was limited. Check your usage or wait before trying again.");
  }

  var parsed;
  try { parsed = JSON.parse(response.getContentText()); } catch (error) { parsed = {}; }
  if (status < 200 || status >= 300) {
    return notification(locale === "nl" ? "De analyse is mislukt. Probeer het later opnieuw." : "The analysis failed. Please try again later.");
  }
  if (!isAnalysisResult(parsed.result)) {
    return notification(locale === "nl" ? "Maillume gaf een ongeldig analyseresultaat terug." : "Maillume returned an invalid analysis result.");
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildResultCard(parsed.result, locale)))
    .build();
}

function buildResultCard(result, locale) {
  var nl = locale === "nl";
  var riskLevels = nl ? { low: "LAAG", medium: "GEMIDDELD", high: "HOOG" } : { low: "LOW", medium: "MEDIUM", high: "HIGH" };
  var classifications = nl
    ? { likely_phishing: "Waarschijnlijk phishing", likely_spam: "Waarschijnlijk spam", likely_legitimate: "Waarschijnlijk legitiem", uncertain: "Onzeker" }
    : { likely_phishing: "Likely phishing", likely_spam: "Likely spam", likely_legitimate: "Likely legitimate", uncertain: "Uncertain" };
  var overflowLabel = nl ? "meer" : "more";
  var signals = formatBullets(result.suspicious_signals, nl ? "Geen specifieke verdachte signalen gevonden." : "No specific suspicious signals detected.", 8, overflowLabel);
  var factors = formatBullets(
    result.score_factors.map(function (factor) {
      return factor.label + ": +" + factor.contribution + (nl ? " punten" : " points");
    }),
    nl ? "Geen scorefactoren toegepast." : "No score factors applied.",
    8,
    overflowLabel,
  );
  var links = formatBullets(result.detected_links, nl ? "Geen links gevonden." : "No links detected.", 5, overflowLabel);

  return CardService.newCardBuilder()
    .setHeader(
      buildBrandHeader(
        (nl ? "Risicoscore " : "Risk score ") + result.risk_score + " / 100 · " + riskLevels[result.risk_level],
      ),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader(classifications[result.classification])
        .addWidget(CardService.newTextParagraph().setText(escapeHtml(result.short_explanation))),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "Waarom deze score?" : "Why this score?")
        .addWidget(
          CardService.newTextParagraph().setText(
            nl
              ? "De score is een gewogen risico-index, geen waarschijnlijkheid of garantie."
              : "The score is a weighted risk index, not a probability or guarantee.",
          ),
        )
        .addWidget(CardService.newDecoratedText().setTopLabel(nl ? "SCOREFACTOREN" : "SCORE FACTORS").setText(factors).setWrapText(true))
        .addWidget(CardService.newDecoratedText().setTopLabel(nl ? "VERDACHTE SIGNALEN" : "SUSPICIOUS SIGNALS").setText(signals).setWrapText(true)),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "Gevonden links" : "Detected links")
        .addWidget(CardService.newTextParagraph().setText(links)),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader(nl ? "Aanbevolen vervolgstap" : "Recommended next step")
        .addWidget(CardService.newTextParagraph().setText("<b>" + escapeHtml(result.recommended_action) + "</b>"))
        .addWidget(
          CardService.newTextParagraph().setText(
            nl
              ? "Dit is een geautomatiseerde risicobeoordeling en biedt geen garantie."
              : "This is an automated risk assessment and should not be considered a guarantee.",
          ),
        ),
    )
    .build();
}

function buildBrandHeader(subtitle) {
  return CardService.newCardHeader()
    .setTitle("Maillume")
    .setSubtitle(subtitle)
    .setImageUrl(MAILLUME_LOGO_URL);
}

function notification(message) {
  return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(message)).build();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatBullets(values, emptyMessage, limit, overflowLabel) {
  if (!values.length) return escapeHtml(emptyMessage);
  var visible = values.slice(0, limit).map(function (value) { return "• " + escapeHtml(value); });
  if (values.length > limit) visible.push("• +" + (values.length - limit) + " " + overflowLabel);
  return visible.join("<br>");
}

function formatApiKeyPrefix(apiKey) {
  return apiKey.slice(0, 10) + "…";
}

function getFormString(e, fieldName) {
  var field = e && e.commonEventObject && e.commonEventObject.formInputs && e.commonEventObject.formInputs[fieldName];
  var values = field && field.stringInputs && field.stringInputs.value;
  return values && values.length ? String(values[0]) : "";
}

function getLocale(e) {
  var locale = e && e.commonEventObject && e.commonEventObject.userLocale;
  return String(locale || "en").toLowerCase().indexOf("nl") === 0 ? "nl" : "en";
}

function getStoredApiKey() {
  return PropertiesService.getUserProperties().getProperty(MAILLUME_API_KEY_PROPERTY) || "";
}

function clearStoredApiKey() {
  PropertiesService.getUserProperties().deleteProperty(MAILLUME_API_KEY_PROPERTY);
}

function isAnalysisResult(result) {
  var classifications = ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"];
  var families = ["identity", "destination", "intent", "delivery", "style"];
  return Boolean(result)
    && typeof result.risk_score === "number" && isFinite(result.risk_score) && result.risk_score >= 0 && result.risk_score <= 100
    && ["low", "medium", "high"].indexOf(result.risk_level) >= 0
    && classifications.indexOf(result.classification) >= 0
    && Array.isArray(result.score_factors)
    && result.score_factors.every(function (factor) { return factor && typeof factor.id === "string" && families.indexOf(factor.family) >= 0 && typeof factor.contribution === "number" && isFinite(factor.contribution) && factor.contribution > 0 && typeof factor.label === "string"; })
    && result.score_factors.reduce(function (total, factor) { return total + factor.contribution; }, 0) === result.risk_score
    && Array.isArray(result.suspicious_signals) && result.suspicious_signals.every(function (signal) { return typeof signal === "string"; })
    && Array.isArray(result.detected_links) && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string" && typeof result.recommended_action === "string";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}
