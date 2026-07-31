# Chrome extension `0.4.1`

Extension `0.4.1` is the Chrome Web Store patch release following published
version `0.4.0`.

- Streams analysis responses under a 256 KiB byte cap, including when a server
  omits or misstates `Content-Length`.
- Bounds response arrays and user-visible text before validation and rendering.
- Documents that detected HTTP(S) destinations and displayed-link/destination
  pairs are sent with the reviewed message when available.
- Preserves the `0.4.0` browser-connection lifecycle and compatibility behavior.

The upload artifact must be built from the final source revision and must have
the same `0.4.1` version in `manifest.json`, generated compatibility metadata,
and release metadata.
