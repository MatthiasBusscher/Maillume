# Maillume Outlook Add-in

The Outlook add-in uses the production manifest at `public/outlook-manifest.xml` and the task pane at `/integrations/outlook`. It requests `ReadItem`, not read/write mailbox access, and reads the currently open message only after the user presses **Analyze this message**.

## Test installation

1. Deploy Maillume over HTTPS and download `https://maillume.io/outlook-manifest.xml`.
2. Sideload the manifest in Outlook using the Microsoft 365 add-in management interface.
3. Create an API key on the Maillume account page and save it in the task pane.
4. Open a synthetic message and run **Check with Maillume**.
5. Verify the task pane shows the destination before retrieval and renders the structured result.

The key is kept in the add-in origin's session storage and can be removed from the task pane. It is cleared when the task-pane browsing session ends. Message text and results remain in task-pane memory and are not persisted by the add-in.

The task pane requires the `analysis-v2` classification and score-factor breakdown, verifies detected links and the factor total, and explains that the score is a risk index rather than a probability.

Task-pane pinning is intentionally disabled in the first release. Supporting it correctly requires a VersionOverrides 1.1 manifest and item-change handling across Outlook clients.
