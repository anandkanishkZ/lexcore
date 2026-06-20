import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { getTokenCookie, getUserData } from "@/lib/cookies";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexcore",
  description: "Legal intelligence platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getTokenCookie();
  const userData = await getUserData();

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full font-sans antialiased">
        <AuthProvider
          initialUser={userData}
          initialAuthenticated={!!token && !!userData}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
