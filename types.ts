import type { Message } from "@vencord/discord-types";

export interface StoredMessage {
    id: string;
    channelId: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
}

export function serializeMessage(message: Message): StoredMessage | null {
    if (!message?.id || !message?.channel_id || !message?.author?.id) return null;

    const content = message.content?.trim()
        || (message.attachments?.length ? `[${message.attachments.length} attachment${message.attachments.length === 1 ? "" : "s"}]` : "");

    if (!content) return null;

    const rawTimestamp = message.timestamp as unknown;
    let timestamp = new Date().toISOString();

    if (rawTimestamp instanceof Date) {
        timestamp = rawTimestamp.toISOString();
    } else if (typeof rawTimestamp === "string" || typeof rawTimestamp === "number") {
        const parsed = new Date(rawTimestamp);
        if (!Number.isNaN(parsed.getTime())) timestamp = parsed.toISOString();
    }

    return {
        id: message.id,
        channelId: message.channel_id,
        authorId: message.author.id,
        authorName: message.author.globalName ?? message.author.username ?? message.author.id,
        content,
        timestamp
    };
}
