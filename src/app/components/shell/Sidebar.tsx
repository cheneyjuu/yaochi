import { useState } from "react";
import { cn } from "../ui/utils";
import { useStore } from "../../lib/store";
import {
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  Circle,
  Gavel,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
  UsersRound,
  Vote,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

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
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { page, setPage, menus } = useStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 找出当前页所在模块，默认展开
  const activeModule = menus.find((m) => m.pages.some((p) => p.id === page))?.id;

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
          "fixed bottom-0 left-0 top-14 z-40 flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:z-auto lg:h-full lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex justify-end border-b border-sidebar-border p-2 lg:hidden">
          <button type="button" className="grid size-8 place-items-center rounded-md hover:bg-sidebar-accent" onClick={onMobileClose} aria-label="关闭导航">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto gov-scroll py-3">
        {menus.map((mod) => {
          const Icon = mod.icon ? (ICONS[mod.icon] ?? Circle) : Circle;
          const open = collapsed[mod.id] === undefined ? mod.id === activeModule || true : !collapsed[mod.id];
          return (
            <div key={mod.id} className="px-2">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [mod.id]: !(open) }))}
                className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1 text-left" style={{ fontWeight: 500 }}>{mod.label}</span>
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
              </button>
              {open && (
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
        <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
          盘古 · 社区治理后台 v1.0
        </div>
      </aside>
    </>
  );
}
