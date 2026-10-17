# ReplyWithChatGPT

Private Vencord userplugin for drafting Discord DM replies with your normal ChatGPT account.

## Current flow

1. Open a 1:1 Discord DM.
2. Click the sparkle beside the composer, or hover a message and click the sparkle.
3. The plugin loads cached context and, on first use for that DM, backfills older messages.
4. It writes the conversation history to `discord-gptreply-context.txt` in your Downloads folder.
5. Finder reveals that file and ChatGPT opens with a short drafting instruction prefilled.
6. Attach `discord-gptreply-context.txt` to ChatGPT.
7. Copy ChatGPT's proposed reply.
8. Switch back to Discord.
9. The plugin inserts the copied draft into the current DM composer automatically.
10. Review or edit it, then send it yourself.

The plugin never presses Enter or sends a Discord message.

You can also right-click the sparkle beside the composer to insert the current clipboard manually.

## History behavior

The plugin keeps a local per-DM history using Vencord DataStore and seeds it from Discord's current MessageStore cache.

When a DM has not been backfilled yet, the plugin also pages backward through the conversation in batches of 100 messages. It currently targets up to roughly 1,200 messages or one year of history, whichever comes first.

The local store retains up to 2,500 messages per DM. The generated context file contains the available stored conversation history from the last year, ordered from oldest to newest.

Once the initial backfill is complete, later drafts reuse the stored history and continue learning from new messages observed by Discord.

## ChatGPT handoff

Large conversation histories are not placed into the ChatGPT URL or pasted into the ChatGPT composer. Instead, the plugin creates `discord-gptreply-context.txt` in Downloads and only sends a short instruction prompt to ChatGPT.

The generated file is overwritten on each draft instead of creating a new file every time.

The instruction tells ChatGPT to wait if the context file has not been attached yet, so it is safe if ChatGPT submits the prefilled instruction immediately instead of leaving it in the composer.

The short instruction is also copied to the clipboard as a fallback. The plugin does not automate or extract the ChatGPT response.

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
- `native.ts`: writes and reveals the local ChatGPT context file
- `history.ts`: local DM storage, cache seeding, and historical backfill
- `prompt.ts`: builds the short ChatGPT instruction and text-file transcript
- `types.ts`: message serialization

## Privacy

The local history is stored through Vencord's DataStore on your machine. Nothing in this plugin sends that history to a custom server.

When you click Draft, the conversation history is written to `discord-gptreply-context.txt` in your Downloads folder. It only reaches ChatGPT when you attach the file yourself. The draft is only inserted back into Discord after you copy it, and the plugin never sends the Discord message for you.
