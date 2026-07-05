import { useStore, COMMUNITIES, ROLES } from "../../lib/store";
import { ModeChip } from "../gov/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Bell, ChevronDown, Search, MapPin, AlertTriangle, LogOut } from "lucide-react";

export function Topbar() {
  const { role, communityId, setCommunityId, community, mode, lockdown, setPage, logout } = useStore();
  const roleMeta = ROLES.find((r) => r.id === role)!;
  const isG = roleMeta.side === "G";
  const canSwitchCommunity = role === "street_admin";

  return (
    <header className="shrink-0">
      {/* G 端监管压条 */}
      {isG && (
        <div className="h-1.5" style={{ backgroundColor: "var(--gov-g-deep)" }} />
      )}
      <div
        className="h-14 flex items-center gap-4 px-5 border-b border-border bg-card"
        style={isG ? { boxShadow: "inset 0 2px 0 0 var(--gov-g-deep)" } : undefined}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 pr-2">
          <div className="grid place-items-center size-8 rounded-md gov-primary-gradient text-white" style={{ fontWeight: 700 }}>
            盘
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>盘古</span>
          {isG && (
            <span className="ml-1 rounded px-1.5 py-0.5 text-[11px] text-white" style={{ backgroundColor: "var(--gov-g-deep)" }}>
              G端监管
            </span>
          )}
        </div>

        {/* 小区 / 辖区切换器 */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-sm hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed" disabled={!canSwitchCommunity}>
            <MapPin className="size-3.5 text-muted-foreground" />
            <span style={{ fontWeight: 500 }}>{communityId === "ALL" ? "辖区汇总（全部小区）" : community.name}</span>
            {canSwitchCommunity && <ChevronDown className="size-3.5 text-muted-foreground" />}
          </DropdownMenuTrigger>
          {canSwitchCommunity && (
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>选择监管范围</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={communityId} onValueChange={(v) => setCommunityId(v)}>
                <DropdownMenuRadioItem value="ALL">辖区汇总（全部小区）</DropdownMenuRadioItem>
                {COMMUNITIES.map((c) => (
                  <DropdownMenuRadioItem key={c.id} value={c.id}>
                    {c.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        {/* 物业模式 Chip */}
        {communityId !== "ALL" && <ModeChip mode={mode} />}

        {/* 换届熔断全局提醒 */}
        {lockdown && (
          <button
            onClick={() => setPage("term-management")}
            className="ml-auto flex items-center gap-1.5 rounded-md px-3 h-9 text-sm text-white gov-pulse"
            style={{ backgroundColor: "var(--gov-danger)" }}
          >
            <AlertTriangle className="size-4" />
            <span style={{ fontWeight: 500 }}>本小区处于换届熔断期，大额资金划拨已锁定</span>
          </button>
        )}

        <div className={lockdown ? "flex items-center gap-3" : "ml-auto flex items-center gap-3"}>
          {/* 搜索 */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              placeholder="搜索议题 / 业主 / 工单…"
              className="h-9 w-52 rounded-md border border-border bg-input-background pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {/* 消息 */}
          <button className="relative grid place-items-center size-9 rounded-md hover:bg-accent">
            <Bell className="size-4.5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full" style={{ backgroundColor: "var(--gov-danger)" }} />
          </button>

          {/* 当前登录用户 */}
          <div className="flex items-center gap-2 rounded-md pl-1 pr-2 h-9">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs gov-primary-gradient text-white">
                {roleMeta.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-left hidden md:block leading-tight">
              <span className="block" style={{ fontWeight: 500 }}>{roleMeta.name}</span>
              <span className="block text-[11px] text-muted-foreground">{roleMeta.scope}</span>
            </span>
          </div>
          <button
            onClick={logout}
            className="grid place-items-center size-9 rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
