import { useEffect, useState } from "react";
import { useStore, COMMUNITIES, ROLES } from "../../lib/store";
import { listSysUserShadows, type SysUserShadow } from "../../lib/auth";
import { ModeChip } from "../gov/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Bell, BriefcaseBusiness, Check, ChevronDown, Loader2, Search, MapPin, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { RoleId } from "../../lib/types";

export function Topbar() {
  const { role, setRole, communityId, setCommunityId, community, mode, lockdown, setPage, switchShadow, logout } = useStore();
  const roleMeta = ROLES.find((r) => r.id === role)!;
  const isG = roleMeta.side === "G";
  const canSwitchCommunity = role === "street_admin";
  const [shadows, setShadows] = useState<SysUserShadow[]>([]);
  const [loadingShadows, setLoadingShadows] = useState(false);
  const [switchingShadowId, setSwitchingShadowId] = useState<number | null>(null);

  const refreshShadows = async () => {
    setLoadingShadows(true);
    try {
      setShadows(await listSysUserShadows());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工作分身加载失败");
    } finally {
      setLoadingShadows(false);
    }
  };

  useEffect(() => {
    void refreshShadows();
  }, []);

  const handleSwitchShadow = async (targetUserId: number) => {
    setSwitchingShadowId(targetUserId);
    try {
      await switchShadow(targetUserId);
      toast.success("工作分身已切换");
      await refreshShadows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工作分身切换失败");
    } finally {
      setSwitchingShadowId(null);
    }
  };

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

          {/* 头像 + 角色切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md pl-1 pr-2 h-9 hover:bg-accent transition-colors">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs gov-primary-gradient text-white">
                  {roleMeta.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-left hidden md:block leading-tight">
                <span className="block" style={{ fontWeight: 500 }}>{roleMeta.name}</span>
                <span className="block text-[11px] text-muted-foreground">{roleMeta.scope}</span>
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>工作分身</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {loadingShadows ? (
                <DropdownMenuItem disabled>
                  <Loader2 className="size-4 animate-spin" /> 正在加载
                </DropdownMenuItem>
              ) : shadows.length > 0 ? (
                shadows.map((shadow) => (
                  <DropdownMenuItem
                    key={shadow.user_id}
                    disabled={shadow.active || switchingShadowId !== null}
                    onClick={() => void handleSwitchShadow(shadow.user_id)}
                    className="flex-col items-start gap-0.5 py-2"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-2" style={{ fontWeight: 500 }}>
                        <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
                        {shadow.role_name ?? shadow.role_key ?? "工作分身"}
                      </span>
                      {shadow.active ? <Check className="size-3.5 text-primary" /> : null}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {shadow.nick_name ?? shadow.user_name} · {shadow.dept_name ?? "未绑定部门"}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>暂无可切换分身</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>切换登录角色（演示）</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as RoleId)}>
                {ROLES.map((r) => (
                  <DropdownMenuRadioItem key={r.id} value={r.id} className="flex-col items-start gap-0.5 py-2">
                    <span className="flex items-center gap-2">
                      <span style={{ fontWeight: 500 }}>{r.name}</span>
                      <span className="rounded px-1 text-[10px]" style={{ backgroundColor: r.side === "G" ? "var(--gov-g-deep)" : "#e8f0fb", color: r.side === "G" ? "#fff" : "#143c78" }}>
                        {r.side}端
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{r.scope}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-4" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
