import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AccessProvider } from "@/components/providers/access-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getRequestAccess } from "@/lib/auth/ip-check";
import "./globals.css";

export const metadata: Metadata = {
  title: "자이닉스 디자인 라이브러리",
  description: "자이닉스 사내 디자인 시안 라이브러리",
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
