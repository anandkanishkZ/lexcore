import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";
import { IFirmSettings } from "../models/firm-settings.model";
import { encryptSecret, decryptSecret } from "../utils/crypto.util";
import { HttpException } from "../exceptions/http-exception";

const firmSettingsRepository = new FirmSettingsMongoRepository();

/** Firm settings as any client (browser or mobile) may see them — the
 * encrypted eSewa secret itself is never serialized, only whether one has
 * been saved, so the admin UI can show "configured" without exposing it. */
export type PublicFirmSettings = Omit<IFirmSettings, "esewaSecretEncrypted"> & {
    esewaSecretConfigured: boolean;
};

/**
 * What the mobile client needs to launch a payment. eSewa's own Flutter SDK
 * requires both clientId AND secretId to be passed into its `EsewaConfig`
 * client-side just to open the native payment sheet — that's the vendor's
 * documented integration model, not a choice made here, and their own docs
 * publish test credentials openly for exactly that reason. It's still kept
 * encrypted at rest (protects a DB dump/backup and is never shown in the
 * admin UI), but any authenticated user has to be able to read it decrypted
 * to pay their own invoice — there's no tighter gate below "authenticated"
 * to put it behind. The actual anti-fraud boundary is NOT this secret's
 * secrecy — it's that EsewaPaymentService never trusts a client-reported
 * "success" and always re-verifies the transaction against eSewa's own
 * server before recording a payment. A leaked secretId only lets someone
 * initiate eSewa payment attempts under the firm's merchant identity; it
 * cannot forge a paid invoice.
 */
export interface EsewaPublicConfig {
    enabled: boolean;
    environment: "test" | "live";
    clientId: string;
    secretId: string;
}

function toPublic(settings: IFirmSettings): PublicFirmSettings {
    const obj = settings.toObject ? settings.toObject() : settings;
    const { esewaSecretEncrypted, ...rest } = obj;
    return { ...rest, esewaSecretConfigured: Boolean(esewaSecretEncrypted) };
}

export class FirmSettingsService {
    async get(): Promise<PublicFirmSettings> {
        const settings = await firmSettingsRepository.get();
        return toPublic(settings);
    }

    async update(data: UpdateFirmSettingsDTO): Promise<PublicFirmSettings> {
        const { esewaSecret, ...rest } = data;
        const payload: Partial<IFirmSettings> = { ...rest };
        // Only touch the stored secret when a real replacement value is
        // sent — an empty/omitted field means "keep what's already saved",
        // not "clear it".
        if (esewaSecret) {
            // encryptSecret throws a plain Error (no .status) when
            // ENCRYPTION_KEY is unset, which handleControllerError would
            // otherwise flatten into an unhelpful generic 500 — checking
            // here surfaces the real, actionable cause instead. Same
            // "explicit precondition, not a caught crash" pattern the AI
            // feature uses for a missing DEEPSEEK_API_KEY.
            if (!process.env.ENCRYPTION_KEY) {
                throw new HttpException(
                    503,
                    "Online payment cannot be configured yet — ENCRYPTION_KEY is not set on the server. Contact your system administrator."
                );
            }
            payload.esewaSecretEncrypted = encryptSecret(esewaSecret);
        }
        const updated = await firmSettingsRepository.update(payload);
        return toPublic(updated);
    }

    /** Used by InvoiceController/EsewaPaymentService — never returns the
     * secret, only what a client needs to open the SDK's payment sheet. */
    async getEsewaPublicConfig(): Promise<EsewaPublicConfig> {
        const settings = await firmSettingsRepository.get();
        if (!settings.esewaEnabled) {
            return { enabled: false, environment: settings.esewaEnvironment, clientId: "", secretId: "" };
        }
        if (settings.esewaSecretEncrypted && !process.env.ENCRYPTION_KEY) {
            // A secret was saved under a since-removed/rotated ENCRYPTION_KEY —
            // report as unconfigured rather than letting decryptSecret's raw
            // error surface as an opaque 500 to a paying client.
            throw new HttpException(503, "Online payment is temporarily unavailable — contact the firm");
        }
        return {
            enabled: true,
            environment: settings.esewaEnvironment,
            clientId: settings.esewaClientId,
            secretId: settings.esewaSecretEncrypted ? decryptSecret(settings.esewaSecretEncrypted) : "",
        };
    }
}
