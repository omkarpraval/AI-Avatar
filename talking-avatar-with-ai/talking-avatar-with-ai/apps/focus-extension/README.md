# AvatarAsk Focus Extension

This extension enables strict lock mode for AvatarAsk Focus Mode by keeping the user on the active AvatarAsk tab.

## Install (one-time)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select this folder:
   - `apps/focus-extension`
5. Keep the extension enabled.
6. After any code updates to the extension, click **Reload** on the extension card in `chrome://extensions`.

## Usage

1. Run AvatarAsk frontend (`localhost:8080` or `localhost:8081`).
2. Open chat page.
3. In Focus controls, confirm you see **Extension Connected**.
4. Enable **Strict Lock** + **Focus Mode**.

## Notes

- Strict tab prevention works only when this extension is installed and enabled.
- If extension is missing/disabled, app falls back to web-only behavior (detect and warn on tab switch).
- In managed/work account Chrome setups, some policies can weaken enforcement.
