# Maillume Outlook Add-in

The Outlook add-in uses the production manifest at `public/outlook-manifest.xml` and the task pane at `/integrations/outlook`. It requests `ReadItem`, not read/write mailbox access, and reads the currently open message only after the user presses **Analyze this message**.

## Test installation

1. Deploy Maillume over HTTPS and download `https://maillume.io/outlook-manifest.xml`.
2. Sideload the manifest in Outlook using the Microsoft 365 add-in management interface.
3. Create an API key on the Maillume account page and save it in the task pane.
4. Open a synthetic message and run **Check with Maillume**.
5. Verify the task pane shows the destination before retrieval and renders the structured result.

The key is stored in the add-in origin's local storage. Message text and results remain in task-pane memory and are not persisted by the add-in.
