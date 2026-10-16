import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { copyToClipboard } from "@utils/clipboard";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, ComponentDispatch, SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { getConversationHistory, rememberMessage } from "./history";
import { buildPrompt } from "./prompt";

interface DraftSession {
    channelId: string;
    prompt: string;
}

let activeSession: DraftSession | null = null;

function SparkleIcon({ height = 20, width = 20, className }: { height?: number | string; width?: number | string; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" height={height} width={width} className={className} fill="currentColor">
            <path d="M12 2.75c.29 3.27 1.16 5.6 2.62 6.99 1.4 1.34 3.6 2.14 6.63 2.41-3.03.27-5.23 1.07-6.63 2.41-1.46 1.39-2.33 3.72-2.62 6.99-.29-3.27-1.16-5.6-2.62-6.99-1.4-1.34-3.6-2.14-6.63-2.41 3.03-.27 5.23-1.07 6.63-2.41C10.84 8.35 11.71 6.02 12 2.75Z" />
        </svg>
    );
}

function insertIntoComposer(text: string) {
    ComponentDispatch.dispatch("INSERT_TEXT", { rawText: text });
}

async function pasteClipboardIntoComposer(channelId: string) {
    if (SelectedChannelStore.getChannelId() !== channelId) return;

    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
        showToast("Clipboard is empty.", Toasts.Type.FAILURE);
        return;
    }

    insertIntoComposer(text);
    activeSession = null;
    showToast("Draft inserted. Review it before sending.", Toasts.Type.SUCCESS);
}

async function prepareDraft(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel?.isDM?.()) return;

    const messages = await getConversationHistory(channelId);
    if (!messages.length) {
        showToast("No DM context is available yet.", Toasts.Type.FAILURE);
        return;
    }

    const prompt = buildPrompt(channelId, messages);
    activeSession = { channelId, prompt };

    copyToClipboard(prompt);
    VencordNative.native.openExternal("https://chatgpt.com/");
    showToast(`Copied context from ${messages.length} messages. Paste it into ChatGPT, then copy the draft.`, Toasts.Type.SUCCESS);
}

async function handleDiscordFocus() {
    const session = activeSession;
    if (!session) return;
    if (SelectedChannelStore.getChannelId() !== session.channelId) return;

    try {
        const clipboard = (await navigator.clipboard.readText()).trim();
        if (!clipboard || clipboard === session.prompt.trim()) return;

        insertIntoComposer(clipboard);
        activeSession = null;
        showToast("ChatGPT draft inserted. Review it before sending.", Toasts.Type.SUCCESS);
    } catch {
        return;
    }
}

const DraftChatBarButton: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    if (!isMainChat || !channel?.isDM?.()) return null;

    return (
        <ChatBarButton
            tooltip="Draft with ChatGPT · right-click to paste clipboard"
            onClick={() => void prepareDraft(channel.id)}
            onContextMenu={event => {
                event.preventDefault();
                void pasteClipboardIntoComposer(channel.id);
            }}
        >
            <SparkleIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "ReplyWithChatGPT",
    description: "Builds a private DM reply prompt for ChatGPT and inserts the copied draft back into Discord without sending it.",
    authors: [{ name: "Vinny", id: 0n }],

    chatBarButton: {
        icon: SparkleIcon,
        render: DraftChatBarButton
    },

    messagePopoverButton: {
        icon: SparkleIcon,
        render(message: Message) {
            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel?.isDM?.()) return null;

            return {
                label: "Draft reply with ChatGPT",
                icon: SparkleIcon,
                message,
                channel,
                onClick: () => void prepareDraft(channel.id)
            };
        }
    },

    flux: {
        MESSAGE_CREATE({ message }: { message: Message; }) {
            rememberMessage(message);
        },
        MESSAGE_UPDATE({ message }: { message: Message; }) {
            rememberMessage(message);
        }
    },

    start() {
        window.addEventListener("focus", handleDiscordFocus);
    },

    stop() {
        window.removeEventListener("focus", handleDiscordFocus);
        activeSession = null;
    }
});
