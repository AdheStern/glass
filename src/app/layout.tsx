import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteSettings } from "@/db/settings";
import { deriveTokens, parseBrandColor, tokensToCss } from "@/theme/derive";
import type { PresetName } from "@/theme/presets";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: settings.name, template: `%s · ${settings.name}` },
    description:
      "Catálogo, punto de venta e inventario para comercios pequeños.",
  };
}

function resolvePreset(name: string): PresetName {
  return name === "NOCTURNO" ? "NOCTURNO" : "MERCADO";
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const tokens = deriveTokens(
    parseBrandColor(settings.brandColor),
    resolvePreset(settings.themePreset),
  );

  return (
    <html
      lang={settings.locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Tokens derivados del color de marca (§10.2). Sin compilación por cliente. */}
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS generado, sin entrada del usuario
          dangerouslySetInnerHTML={{ __html: tokensToCss(tokens) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
