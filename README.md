# ReplyWithChatGPT

Private Vencord userplugin for drafting Discord DM replies with your normal ChatGPT account.

## Current flow

1. Open a 1:1 Discord DM.
2. Click the sparkle beside the composer, or hover a message and click the sparkle.
3. The plugin builds a prompt from the DM context it has locally, copies it, and opens ChatGPT.
4. Paste the prompt into ChatGPT and send it.
5. Copy ChatGPT's proposed reply.
6. Switch back to Discord.
7. The plugin inserts the copied draft into the current DM composer automatically.
8. Review or edit it, then send it yourself.

The plugin never presses Enter or sends a Discord message.

You can also right-click the sparkle beside the composer to insert the current clipboard manually.

## History behavior

The plugin keeps a local per-DM history using Vencord DataStore and also seeds that history from Discord's current MessageStore cache whenever you generate a draft.

It keeps up to 2,500 locally observed messages per DM. Prompt generation considers at most one year of history, then takes up to 1,000 of the newest messages subject to a roughly 70,000-character context cap.

This first version does not perform a bulk historical Discord API backfill. That is intentionally separated from the drafting UI so the history source can be changed without rewriting the rest of the plugin.

## Install

This is a Vencord `userplugin`, so you need a development/source Vencord install rather than only the normal prebuilt installer.

Clone this repository directly into Vencord's userplugins directory:

```bash
git clone https://github.com/vindipierro/discord-gptreply.git Vencord/src/userplugins/replyWithChatGPT
```

Or copy the repository contents to:

```text
Vencord/src/userplugins/replyWithChatGPT/
```

From the Vencord source directory, build or run the normal development watcher, then restart or reload Discord as required by your Vencord setup.

After Discord launches:

1. Open **Settings → Vencord → Plugins**.
2. Find **ReplyWithChatGPT**.
3. Enable it.
4. Open any 1:1 DM.

## Files

- `index.tsx`: Discord UI, ChatGPT handoff, clipboard return flow
- `history.ts`: local DM context storage and MessageStore seeding
- `prompt.ts`: context trimming and ChatGPT prompt generation
- `types.ts`: message serialization

## Privacy

The local history is stored through Vencord's DataStore on your machine. Nothing in this plugin sends that history to a custom server.

When you click Draft, the generated context prompt is placed on your clipboard. You decide whether to paste and submit it to ChatGPT.
