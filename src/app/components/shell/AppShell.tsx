import { useEffect, useState, type ReactNode } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { useStore, ROLES } from "../../lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AlertTriangle, ChevronDown, ChevronRight, Layers } from "lucide-react";
import type { DataScope } from "../../lib/types";

/**
 * 后台统一工作区外壳：承载顶部身份信息、可收起导航和角色页面内容。
 */

const SCOPE_LABEL: Record<DataScope, string> = {
  ALL_DISTRICT: "辖区全部",
  ALL_COMMUNITY: "本小区",
  CUSTOM_BUILDING: "本楼栋",
  ORG_ONLY: "本服务组织",
  SELF: "仅本人",
};

function ContentHeader() {
  const { page, role, dataScope, setDataScope, menus } = useStore();
  const mod = menus.find((m) => m.pages.some((p) => p.id === page));
  const pg = mod?.pages.find((p) => p.id === page);
  const canSwitchScope = role === "street_admin";
  const scopeOptions: DataScope[] = ["ALL_DISTRICT", "ALL_COMMUNITY", "CUSTOM_BUILDING", "ORG_ONLY"];

  return (
    <div className="flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <span className="truncate">{mod?.label}</span>
        <ChevronRight className="size-3.5" />
        <span className="truncate" style={{ color: "var(--gov-text)", fontWeight: 500 }}>{pg?.label}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 h-8 text-xs hover:bg-accent disabled:opacity-70" disabled={!canSwitchScope}>
          <Layers className="size-3.5 text-muted-foreground" />
          <span className="hidden text-muted-foreground sm:inline">数据范围：</span>
          <span style={{ fontWeight: 500 }}>{SCOPE_LABEL[dataScope]}</span>
          {canSwitchScope && <ChevronDown className="size-3 text-muted-foreground" />}
        </DropdownMenuTrigger>
        {canSwitchScope && (
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>ABAC 数据范围</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={dataScope} onValueChange={(v) => setDataScope(v as DataScope)}>
              {scopeOptions.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { lockdown } = useStore();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("yaochi-sidebar-collapsed") === "1",
  );

  useEffect(() => {
    window.localStorage.setItem("yaochi-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Topbar onOpenNavigation={() => setMobileNavigationOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          mobileOpen={mobileNavigationOpen}
          onMobileClose={() => setMobileNavigationOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ContentHeader />
          {lockdown && (
            <div className="flex items-center gap-2 px-6 py-2 text-sm gov-lock-stripes border-b border-[#d14343]/30" style={{ color: "#a32f2f" }}>
              <AlertTriangle className="size-4 shrink-0" />
              <span>本小区已进入 <b className="mx-1">HANDOVER_LOCK 换届熔断态</b>，大额资金划拨接口已死锁，相关放行操作被锁定。</span>
            </div>
          )}
          <div className="gov-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-[1408px]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export { ROLES };
