const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchFirmSettingsApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/settings/firm`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function updateFirmSettingsApi(
    token: string,
    data: {
        name: string;
        logoUrl?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        currency?: string;
        practiceAreas?: string[];
        esewaEnabled?: boolean;
        esewaEnvironment?: "test" | "live";
        esewaClientId?: string;
        esewaSecret?: string;
        khaltiEnabled?: boolean;
        khaltiEnvironment?: "test" | "live";
        khaltiSecretKey?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/settings/firm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}
