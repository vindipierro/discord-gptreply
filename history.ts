import * as DataStore from "@api/DataStore";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Constants, MessageStore, RestAPI } from "@webpack/common";

import { serializeMessage, StoredMessage } from "./types";

const STORE_PREFIX = "ReplyWithChatGPT_history_";
const BACKFILL_STATE_PREFIX = "ReplyWithChatGPT_backfill_";
const MAX_STORED_PER_DM = 2500;
const BACKFILL_TARGET = 1200;
const BACKFILL_PAGE_SIZE = 100;
const MAX_BACKFILL_PAGES = 12;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

interface BackfillState {
    complete: boolean;
    updatedAt: number;
}

const writeQueues = new Map<string, Promise<void>>();

function key(channelId: string) {
    return `${STORE_PREFIX}${channelId}`;
}

function backfillKey(channelId: string) {
    return `${BACKFILL_STATE_PREFIX}${channelId}`;
}

function isOneToOneDm(channelId: string) {
    return ChannelStore.getChannel(channelId)?.isDM?.() === true;
}

async function readStored(channelId: string): Promise<StoredMessage[]> {
    const value = await DataStore.get(key(channelId));
    return Array.isArray(value) ? value as StoredMessage[] : [];
}

async function readBackfillState(channelId: string): Promise<BackfillState | null> {
    const value = await DataStore.get(backfillKey(channelId));
    if (!value || typeof value !== "object") return null;
    return value as BackfillState;
}

async function writeBackfillState(channelId: string, state: BackfillState) {
    await DataStore.set(backfillKey(channelId), state);
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

async function backfillFromDiscord(channelId: string) {
    const state = await readBackfillState(channelId);
    if (state?.complete) return;

    const cutoff = Date.now() - ONE_YEAR_MS;
    const stored = (await readStored(channelId))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const byId = new Map(stored.map(item => [item.id, item]));

    if (byId.size >= BACKFILL_TARGET) {
        await writeBackfillState(channelId, { complete: true, updatedAt: Date.now() });
        return;
    }

    let before = stored[0]?.id;
    let complete = false;

    for (let pageIndex = 0; pageIndex < MAX_BACKFILL_PAGES && byId.size < BACKFILL_TARGET; pageIndex++) {
        let response: any;

        try {
            response = await RestAPI.get({
                url: Constants.Endpoints.MESSAGES(channelId),
                query: {
                    limit: BACKFILL_PAGE_SIZE,
                    ...(before ? { before } : {})
                },
                retries: 2
            });
        } catch {
            break;
        }

        const page = Array.isArray(response?.body) ? response.body as Message[] : [];
        if (!page.length) {
            complete = true;
            break;
        }

        let reachedCutoff = false;

        for (const message of page) {
            const serialized = serializeMessage(message);
            if (!serialized) continue;

            const timestamp = Date.parse(serialized.timestamp);
            if (timestamp < cutoff) {
                reachedCutoff = true;
                continue;
            }

            byId.set(serialized.id, serialized);
        }

        before = page[page.length - 1]?.id;

        if (page.length < BACKFILL_PAGE_SIZE || reachedCutoff || !before) {
            complete = true;
            break;
        }
    }

    await writeStored(channelId, Array.from(byId.values()));

    if (complete || byId.size >= BACKFILL_TARGET) {
        await writeBackfillState(channelId, { complete: true, updatedAt: Date.now() });
    }
}

export async function getConversationHistory(channelId: string) {
    await seedFromDiscordCache(channelId);
    await backfillFromDiscord(channelId);

    const cutoff = Date.now() - ONE_YEAR_MS;
    return (await readStored(channelId))
        .filter(message => Date.parse(message.timestamp) >= cutoff)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}
