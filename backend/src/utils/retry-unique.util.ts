/** MongoDB's duplicate-key error code (unique index violation). */
const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Retries `attempt` when it fails with a duplicate-key error — for
 * "count existing rows, format the next human-readable number, insert"
 * patterns (case/invoice/receipt numbers) where two concurrent requests can
 * compute the same next number and race on the unique index. `attempt` takes
 * no arguments so each retry re-derives the number from a fresh count rather
 * than reusing the one that just lost the race.
 */
export async function retryOnDuplicateKey<T>(attempt: () => Promise<T>, maxAttempts = 5): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await attempt();
        } catch (error: any) {
            lastError = error;
            if (error?.code !== DUPLICATE_KEY_ERROR_CODE) throw error;
        }
    }
    throw lastError;
}
