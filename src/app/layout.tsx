import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { ModalProvider } from "@/components/providers/modal-provider"
import { SessionProvider } from "@/components/providers/session-provider"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sigma Ichibot",
  description: "Website for Production Monitoring Ichibot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
