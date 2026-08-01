# Chrome extension `0.4.2`

Extension `0.4.2` improves the Chrome side-panel workflow after the public
`0.4.1` release.

The side panel now uses the bundled Maillume envelope mark in its header rather
than a text-only placeholder. The image is packaged with the extension; it is
not fetched from a remote service.

Connection state, the selected deployment, and connection controls now live in
a dedicated Settings view opened from the side-panel header. A successful
connection returns directly to the email-review view, so the scanner stays
focused on capture and assessment. Browser credentials still stay outside the
manual-key field.

- Removes the fixed numbered gutter so capture and review controls use the
  available narrow-panel width.
- Keeps the capture and review steps as semantic, labelled sections while
  preserving keyboard controls and existing capture, connection, and analysis
  behavior.
- Adds account recovery guidance for an older extension connection that is
  represented only as a developer key. It never guesses a browser identity,
  reveals or moves a key, or reclassifies historical credential records.

The upload artifact must be built from the final source revision and must have
the same `0.4.2` version in `manifest.json`, generated compatibility metadata,
and release metadata.
