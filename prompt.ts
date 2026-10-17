import { ChannelStore, UserStore } from "@webpack/common";

import type { StoredMessage } from "./types";

function getParticipants(channelId: string) {
    const me = UserStore.getCurrentUser();
    const channel = ChannelStore.getChannel(channelId);
    const otherId = channel?.recipients?.find(id => id !== me.id) ?? channel?.recipients?.[0];
    const other = otherId ? UserStore.getUser(otherId) : undefined;

    return {
        me,
        myName: me.globalName ?? me.username,
        otherName: other?.globalName ?? other?.username ?? "the other person"
    };
}

export function buildInstructionPrompt(channelId: string) {
    const { myName, otherName } = getParticipants(channelId);

    return `Draft my next Discord DM reply using the attached file \`discord-gptreply-context.txt\` as the conversation history.

I am ${myName}. I am talking to ${otherName}.

Infer how I naturally communicate with this specific person from the conversation history. Pay attention to capitalization, punctuation, slang, humor, message length, affection, directness, how often I use multiple short messages, and the overall relationship dynamic. Give much more weight to the most recent part of the conversation when deciding what the reply should actually say.

Do not make me sound more polished, formal, enthusiastic, affectionate, or verbose than I normally sound with this person. Do not invent facts, plans, feelings, or commitments that are not supported by the conversation. If the newest messages do not require a reply, still give the most natural short response I would plausibly send.

If the context file has not been attached yet, wait for it before answering.

Return ONLY the proposed message text. No quotation marks, no explanation, no label, and no markdown.`;
}

export function buildContextFile(channelId: string, messages: StoredMessage[]) {
    const { me, myName, otherName } = getParticipants(channelId);

    const transcript = messages.map(message => {
        const speaker = message.authorId === me.id ? "ME" : "THEM";
        return `${speaker}: ${message.content}`;
    }).join("\n");

    return `Discord DM conversation context

ME: ${myName}
THEM: ${otherName}
Messages: ${messages.length}
Order: oldest to newest

${transcript}\n`;
}
