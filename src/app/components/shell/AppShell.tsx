import { useState, type ReactNode } from "react";
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
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import type { DataScope } from "../../lib/types";

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
    <div className="flex items-center justify-between gap-3 px-3 sm:px-6 h-11 border-b border-border bg-card/60">
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
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Topbar onOpenNavigation={() => setMobileNavigationOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar mobileOpen={mobileNavigationOpen} onMobileClose={() => setMobileNavigationOpen(false)} />
        <main className="flex-1 min-w-0 flex flex-col">
          <ContentHeader />
          {lockdown && (
            <div className="flex items-center gap-2 px-6 py-2 text-sm gov-lock-stripes border-b border-[#d14343]/30" style={{ color: "#a32f2f" }}>
              ⚠ 本小区已进入 <b className="mx-1">HANDOVER_LOCK 换届熔断态</b>，大额资金划拨接口已死锁，相关放行操作被锁定。
            </div>
          )}
          <div className="flex-1 overflow-y-auto gov-scroll p-3 sm:p-6">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export { ROLES };
