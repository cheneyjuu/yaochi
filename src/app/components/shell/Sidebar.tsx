import { useState } from "react";
import { cn } from "../ui/utils";
import { NAV, moduleVisibility } from "../../lib/nav";
import { useStore } from "../../lib/store";
import { ChevronDown, Lock } from "lucide-react";

export function Sidebar() {
  const { role, page, setPage } = useStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 找出当前页所在模块，默认展开
  const activeModule = NAV.find((m) => m.pages.some((p) => p.id === page))?.id;

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto gov-scroll py-3">
        {NAV.map((mod) => {
          const vis = moduleVisibility(role, mod.id);
          if (vis === "hidden") return null;
          const Icon = mod.icon;
          const open = collapsed[mod.id] === undefined ? mod.id === activeModule || true : !collapsed[mod.id];
          const readonly = vis === "readonly";
          return (
            <div key={mod.id} className="px-2">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [mod.id]: !(open) }))}
                className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1 text-left" style={{ fontWeight: 500 }}>{mod.label}</span>
                {readonly && <Lock className="size-3 text-muted-foreground" />}
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
              </button>
              {open && (
                <div className="mt-0.5 mb-1 ml-3 pl-3 border-l border-sidebar-border flex flex-col gap-0.5">
                  {mod.pages.map((p) => {
                    const active = page === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPage(p.id)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          readonly && !active && "opacity-70",
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
  );
}
