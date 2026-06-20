"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { handleLogout } from "../actions/auth";

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    role: string;
    profileImage: string;
    createdAt: string;
    updatedAt: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setIsAuthenticated: (value: boolean) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
    initialUser: User | null;
    initialAuthenticated: boolean;
}

export function AuthProvider({
    children,
    initialUser,
    initialAuthenticated,
}: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
    const [user, setUser] = useState<User | null>(initialUser);
    const [loading] = useState(false);
    const router = useRouter();

    const logout = async () => {
        await handleLogout();
        setIsAuthenticated(false);
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                setUser,
                setIsAuthenticated,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
