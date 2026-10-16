# ReplyWithChatGPT

Private Vencord userplugin for drafting Discord DM replies with your normal ChatGPT account.

## Current flow

1. Open a 1:1 Discord DM.
2. Click the sparkle beside the composer, or hover a message and click the sparkle.
3. The plugin loads cached context and, on first use for that DM, backfills older messages.
4. It builds a reply prompt, copies it as a fallback, and opens ChatGPT with the prompt prefilled.
5. Copy ChatGPT's proposed reply.
6. Switch back to Discord.
7. The plugin inserts the copied draft into the current DM composer automatically.
8. Review or edit it, then send it yourself.

The plugin never presses Enter or sends a Discord message.

You can also right-click the sparkle beside the composer to insert the current clipboard manually.

## History behavior

The plugin keeps a local per-DM history using Vencord DataStore and seeds it from Discord's current MessageStore cache.

When a DM has not been backfilled yet, the plugin also pages backward through the conversation in batches of 100 messages. It currently targets up to roughly 1,200 messages or one year of history, whichever comes first.

The local store retains up to 2,500 messages per DM. Prompt generation can use up to 1,000 of the newest stored messages subject to a roughly 70,000-character context cap.

Once the initial backfill is complete, later drafts reuse the stored history and continue learning from new messages observed by Discord.

## ChatGPT handoff

The prompt is copied to the clipboard as a fallback and included when ChatGPT is opened so it can appear in the ChatGPT composer automatically.

Short prompts use ChatGPT's normal `?q=` prefill URL. Larger prompts use the URL fragment form to avoid sending an oversized HTTP query string.

Depending on ChatGPT's current web behavior, a prefilled prompt may remain in the composer or may be submitted automatically. The plugin does not automate or extract the ChatGPT response.

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
- `history.ts`: local DM storage, cache seeding, and historical backfill
- `prompt.ts`: context trimming and ChatGPT prompt generation
- `types.ts`: message serialization

## Privacy

The local history is stored through Vencord's DataStore on your machine. Nothing in this plugin sends that history to a custom server.

When you click Draft, the generated context is copied to your clipboard and passed to ChatGPT through the launch URL. Your browser may retain that URL in its local browsing history. The draft is only inserted back into Discord after you copy it, and the plugin never sends the Discord message for you.
