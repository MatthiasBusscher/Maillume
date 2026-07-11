var MAILLUME_ENDPOINT = "https://app.maillume.io";

function buildHomeCard() {
  var properties = PropertiesService.getUserProperties();
  var apiKey = properties.getProperty("MAILLUME_API_KEY") || "";

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Maillume").setSubtitle("Current-message risk assessment"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText("Maillume reads a message only after you explicitly choose Analyze this message. Message content and results are not stored by the add-on."))
        .addWidget(
          CardService.newTextInput()
            .setFieldName("apiKey")
            .setTitle("Maillume API key")
            .setHint("mlm_...")
            .setValue(apiKey),
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Save API key")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(CardService.newAction().setFunctionName("saveApiKey")),
        ),
    )
    .build();
}

function buildMessageCard() {
  var configured = Boolean(PropertiesService.getUserProperties().getProperty("MAILLUME_API_KEY"));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText("Nothing has been sent. Press the button to analyze only the message currently open in Gmail."));

  if (configured) {
    section.addWidget(
      CardService.newTextButton()
        .setText("Analyze this message")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName("analyzeCurrentMessage")),
    );
  } else {
    section.addWidget(CardService.newTextParagraph().setText("Open the Maillume add-on home screen and save an API key first."));
  }

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Maillume").setSubtitle("Ready when you are"))
    .addSection(section)
    .build();
}

function saveApiKey(e) {
  var key = String(e.commonEventObject.formInputs.apiKey.stringInputs.value[0] || "").trim();
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(key)) return notification("Enter a valid Maillume API key.");
  PropertiesService.getUserProperties().setProperty("MAILLUME_API_KEY", key);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("API key saved for your Google account."))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard()))
    .build();
}

function analyzeCurrentMessage(e) {
  var apiKey = PropertiesService.getUserProperties().getProperty("MAILLUME_API_KEY");
  if (!apiKey) return notification("Save a Maillume API key first.");

  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  var message = GmailApp.getMessageById(e.gmail.messageId);
  var payload = {
    source: "paste",
    subject: message.getSubject().slice(0, 300),
    senderEmail: message.getFrom().slice(0, 320),
    body: message.getPlainBody().slice(0, 20000)
  };

  var response = UrlFetchApp.fetch(MAILLUME_ENDPOINT + "/api/v1/analyze", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  var parsed;
  try { parsed = JSON.parse(response.getContentText()); } catch (error) { parsed = {}; }
  if (status < 200 || status >= 300) return notification(parsed.error || "Maillume analysis failed.");

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildResultCard(parsed.result)))
    .build();
}

function buildResultCard(result) {
  var signals = result.suspicious_signals.length ? result.suspicious_signals.map(function (signal) { return "• " + escapeHtml(signal); }).join("<br>") : "No specific suspicious signals were detected.";
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Risk score " + result.risk_score + " · " + String(result.risk_level).toUpperCase()).setSubtitle("Automated assessment, never a guarantee"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(escapeHtml(result.short_explanation)))
        .addWidget(CardService.newDecoratedText().setTopLabel("SUSPICIOUS SIGNALS").setText(signals).setWrapText(true))
        .addWidget(CardService.newDecoratedText().setTopLabel("RECOMMENDED ACTION").setText(escapeHtml(result.recommended_action)).setWrapText(true))
        .addWidget(CardService.newTextParagraph().setText("This is an automated risk assessment and should not be considered a guarantee.")),
    )
    .build();
}

function notification(message) {
  return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(message)).build();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
