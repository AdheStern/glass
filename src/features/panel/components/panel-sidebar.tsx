"use client";
import {
  Boxes,
  FolderTree,
  Gauge,
  Inbox,
  LogOut,
  Monitor,
  Package,
  Settings,
  Tag,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/features/auth/actions";
import type { NavItem } from "@/features/panel/nav-items";

const ICONS = {
  gauge: Gauge,
  package: Package,
  "folder-tree": FolderTree,
  tag: Tag,
  upload: Upload,
  inbox: Inbox,
  settings: Settings,
  boxes: Boxes,
  tags: Tags,
  monitor: Monitor,
  users: Users,
} as const;

export function PanelSidebar({
  items,
  siteName,
  userEmail,
}: {
  items: NavItem[];
  siteName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <span className="font-semibold tracking-tight">{siteName}</span>
        <span className="text-xs text-muted-foreground">Panel</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 px-3 py-3">
        <span className="truncate text-xs text-muted-foreground">
          {userEmail}
        </span>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="mr-2 size-4" />
            Salir
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
