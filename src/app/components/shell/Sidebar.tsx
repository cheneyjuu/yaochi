import { useState } from "react";
import { cn } from "../ui/utils";
import { useStore } from "../../lib/store";
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
          "fixed bottom-0 left-0 top-14 z-40 flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-200 lg:static lg:z-auto lg:h-full lg:translate-x-0",
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
        {menus.map((mod) => {
          const Icon = mod.icon ? (ICONS[mod.icon] ?? Circle) : Circle;
          const open = collapsedModules[mod.id] === undefined
            ? mod.id === activeModule
            : !collapsedModules[mod.id];
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
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                iconOnly && "justify-center px-2",
                iconOnly && mod.id === activeModule && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {!iconOnly && <span className="flex-1 text-left" style={{ fontWeight: 500 }}>{mod.label}</span>}
              {!iconOnly && <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />}
            </button>
          );
          return (
            <div key={mod.id} className={cn("px-2", iconOnly && "px-1")}>
              {iconOnly ? (
                <Tooltip>
                  <TooltipTrigger asChild>{moduleButton}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>{mod.label}</TooltipContent>
                </Tooltip>
              ) : moduleButton}
              {!iconOnly && open && (
                <div className="mt-0.5 mb-1 ml-3 pl-3 border-l border-sidebar-border flex flex-col gap-0.5">
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
                          "rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
        </nav>
        <div className={cn("hidden h-12 items-center border-t border-sidebar-border lg:flex", iconOnly ? "justify-center px-2" : "justify-between px-3")}>
          {!iconOnly && <span className="text-[11px] text-muted-foreground">盘古 · 社区治理后台 v1.0</span>}
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
