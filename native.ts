import { app, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

const CONTEXT_FILE_NAME = "discord-gptreply-context.txt";

function getContextPath() {
    return join(app.getPath("downloads"), CONTEXT_FILE_NAME);
}

export async function writeContextFile(_: IpcMainInvokeEvent, content: string) {
    const filePath = getContextPath();
    await writeFile(filePath, content, "utf8");
    return filePath;
}

export async function revealContextFile(_: IpcMainInvokeEvent) {
    shell.showItemInFolder(getContextPath());
}
