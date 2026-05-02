import { ApiError } from "./apiError";

export interface StoryGroupCursorPayload {
  p: number;
  id: string;
}

export function encodeStoryGroupCursor(priority: number, id: string): string {
  const payload: StoryGroupCursorPayload = { p: priority, id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeStoryGroupCursor(raw: string): StoryGroupCursorPayload {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error();
    const p = (parsed as StoryGroupCursorPayload).p;
    const id = (parsed as StoryGroupCursorPayload).id;
    if (typeof p !== "number" || typeof id !== "string") throw new Error();
    return { p, id };
  } catch {
    throw new ApiError(422, "invalid_cursor", "Invalid cursor value");
  }
}
