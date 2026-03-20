import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts";
import { JetBrains_Mono } from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "DevHub Central",
  description:
    "Personal project dashboard — manage all your deployed projects in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={jetbrainsMono.variable}
      style={{ height: "100%" }}
    >
      <body style={{ height: "100%", margin: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
