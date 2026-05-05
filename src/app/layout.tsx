import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QuotaReachedModal } from "@/components/quota/quota-reached-modal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";

export const metadata: Metadata = {
  title: "PostPilot - AI LinkedIn Content Partner",
  description:
    "Create engaging LinkedIn posts with AI-powered brainstorming, drafting, and scheduling.",
  ...(ADSENSE_PUBLISHER_ID && {
    other: {
      "google-adsense-account": ADSENSE_PUBLISHER_ID,
    },
  }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning on <body> matches the one on <html>:
          some browser extensions (Grammarly, Dark Reader, password
          managers) inject inline styles/attributes here before React
          hydrates, which trips React's mismatch warning even though
          hydration itself is unaffected. */}
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <QuotaReachedModal />
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
        {ADSENSE_PUBLISHER_ID && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
