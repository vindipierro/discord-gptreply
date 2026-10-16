import * as DataStore from "@api/DataStore";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, MessageStore } from "@webpack/common";

import { serializeMessage, StoredMessage } from "./types";

const STORE_PREFIX = "ReplyWithChatGPT_history_";
const MAX_STORED_PER_DM = 2500;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const writeQueues = new Map<string, Promise<void>>();

function key(channelId: string) {
    return `${STORE_PREFIX}${channelId}`;
}

function isOneToOneDm(channelId: string) {
    return ChannelStore.getChannel(channelId)?.isDM?.() === true;
}

async function readStored(channelId: string): Promise<StoredMessage[]> {
    const value = await DataStore.get(key(channelId));
    return Array.isArray(value) ? value as StoredMessage[] : [];
}

async function writeStored(channelId: string, messages: StoredMessage[]) {
    const trimmed = messages
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
        .slice(-MAX_STORED_PER_DM);

    await DataStore.set(key(channelId), trimmed);
}

export function rememberMessage(message: Message) {
    if (!isOneToOneDm(message.channel_id)) return;

    const serialized = serializeMessage(message);
    if (!serialized) return;

    const previous = writeQueues.get(message.channel_id) ?? Promise.resolve();
    const next = previous.then(async () => {
        const stored = await readStored(message.channel_id);
        const byId = new Map(stored.map(item => [item.id, item]));
        byId.set(serialized.id, serialized);
        await writeStored(message.channel_id, Array.from(byId.values()));
    }).catch(() => undefined);

    writeQueues.set(message.channel_id, next);
}

async function seedFromDiscordCache(channelId: string) {
    const cache = MessageStore.getMessages(channelId);
    const cached: StoredMessage[] = [];

    cache?.forEach(message => {
        const serialized = serializeMessage(message);
        if (serialized) cached.push(serialized);
    });

    if (!cached.length) return;

    const stored = await readStored(channelId);
    const byId = new Map(stored.map(item => [item.id, item]));

    for (const item of cached) byId.set(item.id, item);
    await writeStored(channelId, Array.from(byId.values()));
}

export async function getConversationHistory(channelId: string) {
    await seedFromDiscordCache(channelId);

    const cutoff = Date.now() - ONE_YEAR_MS;
    return (await readStored(channelId))
        .filter(message => Date.parse(message.timestamp) >= cutoff)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
