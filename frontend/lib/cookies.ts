import { cookies } from "next/headers";

export async function setTokenCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}

export async function getTokenCookie() {
    const cookieStore = await cookies();
    return cookieStore.get("auth_token")?.value;
}

export async function storeUserData(user: any) {
    const cookieStore = await cookies();
    cookieStore.set("user_data", JSON.stringify(user), {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}

export async function getUserData() {
    try {
        const cookieStore = await cookies();
        const userData = cookieStore.get("user_data")?.value;
        return userData ? JSON.parse(userData) : null;
    } catch {
        return null;
    }
}

export async function clearAuthCookies() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    cookieStore.delete("user_data");
}
