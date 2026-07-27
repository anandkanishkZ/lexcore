import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";
import { IFirmSettings } from "../models/firm-settings.model";
import { encryptSecret } from "../utils/crypto.util";
import { HttpException } from "../exceptions/http-exception";

const firmSettingsRepository = new FirmSettingsMongoRepository();

/** Firm settings as any client (browser or mobile) may see them — the
 * encrypted eSewa/Khalti secrets themselves are never serialized, only
 * whether one has been saved, so the admin UI can show "configured" without
 * exposing them. */
export type PublicFirmSettings = Omit<IFirmSettings, "esewaSecretEncrypted" | "khaltiSecretKeyEncrypted"> & {
    esewaSecretConfigured: boolean;
    khaltiSecretKeyConfigured: boolean;
};

/** What any client needs to decide whether to show a "Pay with eSewa"
 * button at all — nothing more. Unlike the native-SDK integration this
 * replaced, eSewa's ePay v2 flow signs every payment request server-side
 * (see EsewaPaymentService.initiate), so the merchant secret — and even the
 * merchant/product code itself — never has to reach the client. */
export interface EsewaPublicConfig {
    enabled: boolean;
    environment: "test" | "live";
}

/** Same rationale as EsewaPublicConfig — Khalti's secret key never reaches
 * the client either; see KhaltiPaymentService.initiate. */
export interface KhaltiPublicConfig {
    enabled: boolean;
    environment: "test" | "live";
}

function toPublic(settings: IFirmSettings): PublicFirmSettings {
    const obj = settings.toObject ? settings.toObject() : settings;
    const { esewaSecretEncrypted, khaltiSecretKeyEncrypted, ...rest } = obj;
    return {
        ...rest,
        esewaSecretConfigured: Boolean(esewaSecretEncrypted),
        khaltiSecretKeyConfigured: Boolean(khaltiSecretKeyEncrypted),
    };
}

export class FirmSettingsService {
    async get(): Promise<PublicFirmSettings> {
        const settings = await firmSettingsRepository.get();
        return toPublic(settings);
    }

    async update(data: UpdateFirmSettingsDTO): Promise<PublicFirmSettings> {
        const { esewaSecret, khaltiSecretKey, ...rest } = data;
        const payload: Partial<IFirmSettings> = { ...rest };
        // Only touch a stored secret when a real replacement value is sent —
        // an empty/omitted field means "keep what's already saved", not
        // "clear it". Same rule for both gateways' secrets.
        if (esewaSecret || khaltiSecretKey) {
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
            if (esewaSecret) payload.esewaSecretEncrypted = encryptSecret(esewaSecret);
            if (khaltiSecretKey) payload.khaltiSecretKeyEncrypted = encryptSecret(khaltiSecretKey);
        }
        const updated = await firmSettingsRepository.update(payload);
        return toPublic(updated);
    }

    /** Non-sensitive firm info any signed-in user (staff or client) may
     * need to render correctly — currently just what's needed to format a
     * currency amount consistently with what the firm actually configured,
     * instead of every call site hardcoding "USD". */
    async getPublicInfo(): Promise<{ name: string; currency: string }> {
        const settings = await firmSettingsRepository.get();
        return { name: settings.name, currency: settings.currency };
    }

    /** Used by the client to decide whether to show a "Pay with eSewa"
     * button — the actual payment fields are only ever built server-side,
     * per-invoice, at initiate() time (see EsewaPaymentService). */
    async getEsewaPublicConfig(): Promise<EsewaPublicConfig> {
        const settings = await firmSettingsRepository.get();
        if (!settings.esewaEnabled) {
            return { enabled: false, environment: settings.esewaEnvironment };
        }
        if (settings.esewaSecretEncrypted && !process.env.ENCRYPTION_KEY) {
            // A secret was saved under a since-removed/rotated ENCRYPTION_KEY —
            // report as unconfigured rather than letting a later decryptSecret
            // call fail with an opaque 500 when the client actually pays.
            throw new HttpException(503, "Online payment is temporarily unavailable — contact the firm");
        }
        return { enabled: true, environment: settings.esewaEnvironment };
    }

    /** Same purpose as getEsewaPublicConfig, for Khalti. */
    async getKhaltiPublicConfig(): Promise<KhaltiPublicConfig> {
        const settings = await firmSettingsRepository.get();
        if (!settings.khaltiEnabled) {
            return { enabled: false, environment: settings.khaltiEnvironment };
        }
        if (settings.khaltiSecretKeyEncrypted && !process.env.ENCRYPTION_KEY) {
            throw new HttpException(503, "Online payment is temporarily unavailable — contact the firm");
        }
        return { enabled: true, environment: settings.khaltiEnvironment };
    }
}
