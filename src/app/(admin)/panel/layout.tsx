import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSiteSettings } from "@/db/settings";
import { requirePanel } from "@/features/auth/roles";
import { PanelSidebar } from "@/features/panel/components/panel-sidebar";
import { visibleNav } from "@/features/panel/nav-items";

// El panel está detrás de sesión (cookies): bloquea legítimamente, no se prerenderiza.
export const instant = false;

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [profile, settings] = await Promise.all([
    requirePanel(),
    getSiteSettings(),
  ]);

  return (
    <SidebarProvider>
      <PanelSidebar
        items={visibleNav(profile.role)}
        siteName={settings.name}
        userEmail={profile.email}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">Glass · Panel</span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
