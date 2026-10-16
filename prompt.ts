import { ChannelStore, UserStore } from "@webpack/common";

import type { StoredMessage } from "./types";

const MAX_MESSAGES = 1000;
const MAX_CONTEXT_CHARS = 70000;

function trimHistory(messages: StoredMessage[]) {
    const selected: StoredMessage[] = [];
    let chars = 0;

    for (let index = messages.length - 1; index >= 0 && selected.length < MAX_MESSAGES; index--) {
        const message = messages[index];
        const cost = message.content.length + message.authorName.length + 16;

        if (selected.length > 0 && chars + cost > MAX_CONTEXT_CHARS) break;

        selected.push(message);
        chars += cost;
    }

    return selected.reverse();
}

export function buildPrompt(channelId: string, messages: StoredMessage[]) {
    const me = UserStore.getCurrentUser();
    const channel = ChannelStore.getChannel(channelId);
    const otherId = channel?.recipients?.find(id => id !== me.id) ?? channel?.recipients?.[0];
    const other = otherId ? UserStore.getUser(otherId) : undefined;
    const myName = me.globalName ?? me.username;
    const otherName = other?.globalName ?? other?.username ?? "the other person";
    const history = trimHistory(messages);

    const transcript = history.map(message => {
        const speaker = message.authorId === me.id ? "ME" : "THEM";
        return `${speaker}: ${message.content}`;
    }).join("\n");

    return `Draft my next Discord DM reply.

I am ${myName}. I am talking to ${otherName}.

Infer how I naturally communicate with this specific person from the conversation history. Pay attention to capitalization, punctuation, slang, humor, message length, affection, directness, how often I use multiple short messages, and the overall relationship dynamic. Give much more weight to the most recent part of the conversation when deciding what the reply should actually say.

Do not make me sound more polished, formal, enthusiastic, affectionate, or verbose than I normally sound with this person. Do not invent facts, plans, feelings, or commitments that are not supported by the conversation. If the newest messages do not require a reply, still give the most natural short response I would plausibly send.

Return ONLY the proposed message text. No quotation marks, no explanation, no label, and no markdown.

Conversation history, oldest to newest:

${transcript}`;
}
