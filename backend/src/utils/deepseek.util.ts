import OpenAI from "openai";
import { DEEPSEEK_API_KEY } from "../configs/constant";
import { HttpException } from "../exceptions/http-exception";

// DeepSeek's API is OpenAI-compatible, so the official `openai` SDK works
// unchanged pointed at DeepSeek's baseURL — no separate SDK needed.
const client = DEEPSEEK_API_KEY
    ? new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: DEEPSEEK_API_KEY })
    : null;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Runs a single chat completion against DeepSeek. On the critical path of a
 * request the caller is actively waiting on (unlike mail.util.ts's
 * fire-and-forget sendMail), so this throws rather than swallowing errors:
 * a clear 503 if the feature isn't configured, a 502 if the call itself
 * fails.
 */
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
    if (!client) {
        throw new HttpException(503, "AI features are not configured");
    }

    try {
        const completion = await client.chat.completions.create({
            model: "deepseek-chat",
            messages,
        });
        return completion.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
        console.error("[deepseek:error]", error);
        throw new HttpException(502, "AI service request failed");
    }
}
