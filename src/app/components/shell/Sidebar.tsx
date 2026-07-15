import { useState } from "react";
import { cn } from "../ui/utils";
import { useStore } from "../../lib/store";
import type { NavModule } from "../../lib/nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  Circle,
  Gavel,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
  UsersRound,
  Vote,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * 后台角色工作台的主导航：按授权菜单组织页面，并提供模块折叠与图标栏收起能力。
 * 视觉密度参考企业级后台的轻量侧栏，强化一级模块与二级业务页的阅读层级。
 */

const ICONS: Record<string, LucideIcon> = {
  Building2,
  BriefcaseBusiness,
  Gavel,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
  UsersRound,
  Vote,
  Wrench,
};

/**
 * 关联业务：管理端不同角色会取得不同的后端授权模块；这里仅做视觉归类，
 * 不改变菜单顺序来源、页面权限或数据范围。
 */
const NAVIGATION_GROUPS = [
  { id: "work", label: "工作空间", modules: ["dashboard", "supplier-service"] },
  { id: "operation", label: "社区运营", modules: ["property", "assets", "community-space"] },
  { id: "governance", label: "业主治理", modules: ["governance", "committee", "election", "comms"] },
  { id: "control", label: "监督与配置", modules: ["finance", "users"] },
] as const;

interface NavigationGroup {
  id: string;
  label: string;
  modules: NavModule[];
}

function groupNavigationModules(menus: NavModule[]): NavigationGroup[] {
  const ungrouped = new Set(menus.map((module) => module.id));
  const groups = NAVIGATION_GROUPS.map((group) => {
    const modules = group.modules
      .map((moduleId) => menus.find((module) => module.id === moduleId))
      .filter((module): module is NavModule => Boolean(module));
    modules.forEach((module) => ungrouped.delete(module.id));
    return { id: group.id, label: group.label, modules };
  }).filter((group) => group.modules.length > 0);

  const remaining = menus.filter((module) => ungrouped.has(module.id));
  return remaining.length > 0
    ? [...groups, { id: "other", label: "其他功能", modules: remaining }]
    : groups;
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onCollapsedChange,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const { page, setPage, menus } = useStore();
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const navigationGroups = groupNavigationModules(menus);

  // 当前角色工作台所属模块默认展开，其余模块在首次进入时保持收起。
  const activeModule = menus.find((m) => m.pages.some((p) => p.id === page))?.id;
  // 移动端抽屉始终显示完整导航，桌面端才进入紧凑图标栏。
  const iconOnly = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          className="fixed inset-0 top-14 z-30 bg-black/30 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-40 flex w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar shadow-[1px_0_0_rgba(16,42,86,0.02)] transition-[transform,width] duration-200 lg:static lg:z-auto lg:h-full lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex justify-end border-b border-sidebar-border p-2 lg:hidden">
          <button type="button" className="grid size-8 place-items-center rounded-md hover:bg-sidebar-accent" onClick={onMobileClose} aria-label="关闭导航">
            <X className="size-4" />
          </button>
        </div>
        <nav className={cn("gov-scroll flex-1 overflow-y-auto py-3", iconOnly && "px-1")}>
        {navigationGroups.map((group, groupIndex) => (
          <section
            key={group.id}
            aria-label={group.label}
            className={cn(
              "px-2",
              groupIndex > 0 && "mt-3 border-t border-sidebar-border/75 pt-3",
              iconOnly && "px-1",
            )}
          >
            {!iconOnly && (
              <div className="mb-1.5 px-3 text-[10px] font-semibold leading-4 tracking-[0.12em] text-[#8b96a8]">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
            {group.modules.map((mod) => {
          const Icon = mod.icon ? (ICONS[mod.icon] ?? Circle) : Circle;
          const open = collapsedModules[mod.id] === undefined
            ? mod.id === activeModule
            : !collapsedModules[mod.id];
          const containsActivePage = mod.id === activeModule;
          const collapseModule = () => {
            if (iconOnly) {
              onCollapsedChange?.(false);
              setCollapsedModules((current) => ({ ...current, [mod.id]: false }));
              return;
            }
            setCollapsedModules((current) => ({ ...current, [mod.id]: open }));
          };
          const moduleButton = (
            <button
              type="button"
              onClick={collapseModule}
              aria-expanded={iconOnly ? undefined : open}
              aria-label={iconOnly ? `展开${mod.label}导航` : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-[12px] font-semibold tracking-[0.01em] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                iconOnly && "justify-center px-2",
                containsActivePage && "text-sidebar-accent-foreground",
                iconOnly && containsActivePage && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-[15px] shrink-0 text-muted-foreground", containsActivePage && "text-sidebar-primary")} />
              {!iconOnly && <span className="flex-1 text-left">{mod.label}</span>}
              {!iconOnly && <ChevronDown className={cn("size-3.5 text-muted-foreground/75 transition-transform", !open && "-rotate-90")} />}
            </button>
          );
          return (
            <div key={mod.id}>
              {iconOnly ? (
                <Tooltip>
                  <TooltipTrigger asChild>{moduleButton}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>{mod.label}</TooltipContent>
                </Tooltip>
              ) : moduleButton}
              {!iconOnly && open && (
                <div className="mt-0.5 mb-1 ml-[21px] flex flex-col gap-0.5 border-l border-sidebar-border/80 pl-2.5">
                  {mod.pages.map((p) => {
                    const active = page === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPage(p.id);
                          onMobileClose?.();
                        }}
                        className={cn(
                          "relative min-h-8 rounded-md px-3 py-1.5 text-left text-[12px] font-medium leading-5 transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                            : "text-[#677487] hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
            })}
            </div>
          </section>
        ))}
        </nav>
        <div className={cn("hidden h-12 items-center border-t border-sidebar-border lg:flex", iconOnly ? "justify-center px-2" : "justify-between px-3")}>
          {!iconOnly && <span className="text-[9px] font-medium tracking-[0.04em] text-muted-foreground">盘古 · 社区治理后台 v1.0</span>}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => onCollapsedChange?.(!collapsed)}
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>{collapsed ? "展开侧边栏" : "收起侧边栏"}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}
