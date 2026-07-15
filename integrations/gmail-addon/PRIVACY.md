# Maillume Gmail Add-on Privacy Notes

These notes describe data handling performed by the Maillume Gmail add-on itself. The hosted Maillume service has its own privacy notice for server-side analysis.

## Data accessed

The add-on receives temporary access to only the Gmail message that is open when the user invokes the add-on. It does not request permission to read the mailbox, a whole thread, or messages in the background.

The sender, subject, and plain-text body of the open message are read only after the user presses **Analyze this message**. They are sent over HTTPS to `https://app.maillume.io/api/v1/analyze` for that requested assessment.

## Data stored by the add-on

The add-on stores one value: the Maillume API key supplied by the user. It is stored with Google Apps Script `PropertiesService.getUserProperties()`, scoped to that Google user and this add-on. The key is used only as the bearer credential for requests to Maillume and is not redisplayed after it is saved.

The stored key remains until one of these events:

- The user removes it from the add-on.
- The user replaces it with another key.
- A Maillume request returns `401` or `403`, indicating that the key is expired, revoked, or otherwise unauthorized. The add-on then deletes the stored key automatically.

The add-on does not claim that the User Properties value is client-side encrypted. Users can remove it at any time from the add-on home card.

## Data not stored

The add-on does not store Gmail message content, sender addresses, subjects, extracted links, request payloads, analysis results, or error response bodies in User Properties, cache, files, analytics, or logs. Apps Script exception logging is disabled in the manifest.

## OAuth access

The manifest requests only the scopes required to run the add-on, access the current Gmail message after a user action, call the Maillume HTTPS endpoint, and use Gmail's locale for English or Dutch cards. It does not request mailbox-wide Gmail read access.

## Self-hosted deployments

The official deployment sends analysis requests only to `https://app.maillume.io/`. A self-hosted operator must publish a separate Apps Script deployment with its own endpoint allowlist and is responsible for documenting that deployment's storage, retention, and server-side processing.
