import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AccessProvider } from "@/components/providers/access-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getRequestAccess } from "@/lib/auth/ip-check";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAllowed } = await getRequestAccess();
  return (
    <html lang="ko" suppressHydrationWarning className="h-full">
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccessProvider isAllowed={isAllowed}>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </AccessProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
