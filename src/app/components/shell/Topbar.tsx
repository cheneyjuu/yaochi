// 关联业务：展示当前受后端租户上下文约束的小区、物业管理模式和工作身份。
import { useEffect, useState } from "react";
import { useStore, ROLES } from "../../lib/store";
import type { NavModule } from "../../lib/nav";
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { AlertTriangle, Bell, Check, ChevronDown, LoaderCircle, LogOut, MapPin, Menu, Search } from "lucide-react";
import { toast } from "sonner";

function NavigationSearch({
  menus,
  currentPage,
  onNavigate,
}: {
  menus: NavModule[];
  currentPage: string;
  onNavigate: (pageId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);
      const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const directShortcut = event.key === "/" && !isEditing;
      if (!commandShortcut && !directShortcut) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const navigate = (pageId: string) => {
    onNavigate(pageId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-input-background px-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card lg:flex"
        aria-label="搜索功能与页面"
      >
        <Search className="size-3.5 shrink-0" />
        <span>搜索功能与页面</span>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="搜索功能与页面"
        description="在当前工作身份已授权的菜单中查找页面"
      >
        <CommandInput placeholder="输入页面名称" />
        <CommandList>
          <CommandEmpty>未找到匹配页面</CommandEmpty>
          {menus.map((module) => (
            <CommandGroup key={module.id} heading={module.label}>
              {module.pages.map((candidate) => (
                <CommandItem
                  key={candidate.id}
                  value={`${module.label} ${candidate.label}`}
                  onSelect={() => navigate(candidate.id)}
                >
                  <span className="flex-1">{candidate.label}</span>
                  {candidate.id === currentPage && <Check className="size-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function Topbar({ onOpenNavigation }: { onOpenNavigation?: () => void }) {
  const {
    role,
    communityId,
    setCommunityId,
    community,
    managedCommunities,
    communitySwitching,
    mode,
    lockdown,
    menus,
    page,
    setPage,
    logout,
  } = useStore();
  const roleMeta = ROLES.find((r) => r.id === role)!;
  const isG = roleMeta.side === "G";
  const isSupplier = roleMeta.side === "S";
  const canSwitchCommunity = role === "street_admin";

  return (
    <header className="shrink-0">
      {/* G 端监管压条 */}
      {isG && (
        <div className="h-1.5" style={{ backgroundColor: "var(--gov-g-deep)" }} />
      )}
      <div
        className="h-14 flex items-center gap-2 border-b border-border bg-card px-3 shadow-[0_1px_2px_rgba(16,42,70,0.04)] sm:gap-4 sm:px-5"
        style={isG ? { boxShadow: "inset 0 2px 0 0 var(--gov-g-deep)" } : undefined}
      >
        <button
          type="button"
          onClick={onOpenNavigation}
          className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-accent lg:hidden"
          aria-label="打开导航"
        >
          <Menu className="size-5" />
        </button>
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2 sm:pr-2">
          <div className="grid place-items-center size-8 rounded-md gov-primary-gradient text-white" style={{ fontWeight: 700 }}>
            盘
          </div>
          <span className="hidden sm:block leading-tight">
            <span className="block text-[15px]" style={{ fontWeight: 700 }}>盘古</span>
            <span className="block text-[10px] text-muted-foreground">社区治理工作台</span>
          </span>
          {isG && (
            <span className="ml-1 rounded px-1.5 py-0.5 text-[11px] text-white" style={{ backgroundColor: "var(--gov-g-deep)" }}>
              G端监管
            </span>
          )}
        </div>

        {/* 小区 / 辖区切换器 */}
        {isSupplier ? (
          <div className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium">
            供应商工作台
          </div>
        ) : <DropdownMenu>
          <DropdownMenuTrigger
            className="flex min-w-0 max-w-36 items-center gap-1.5 rounded-md border border-border px-2 h-9 text-sm hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed sm:max-w-none sm:px-3"
            disabled={!canSwitchCommunity || managedCommunities.length === 0 || communitySwitching}
          >
            <MapPin className="size-3.5 text-muted-foreground" />
            <span className="truncate" style={{ fontWeight: 500 }}>{community.name}</span>
            {communitySwitching
              ? <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
              : canSwitchCommunity && <ChevronDown className="size-3.5 text-muted-foreground" />}
          </DropdownMenuTrigger>
          {canSwitchCommunity && (
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>选择监管小区</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {managedCommunities.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">暂无可切换的小区</p>
              ) : (
                <DropdownMenuRadioGroup
                  value={communityId}
                  onValueChange={(tenantId) => {
                    void setCommunityId(tenantId).catch((error) => {
                      toast.error(error instanceof Error ? error.message : "小区切换失败");
                    });
                  }}
                >
                  {managedCommunities.map((communityOption) => (
                    <DropdownMenuRadioItem
                      key={communityOption.tenant_id}
                      value={String(communityOption.tenant_id)}
                      disabled={communitySwitching}
                    >
                      {communityOption.tenant_name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
            </DropdownMenuContent>
          )}
        </DropdownMenu>}

        {/* 物业模式 Chip */}
        {!isSupplier && <ModeChip mode={mode} className="hidden md:inline-flex" />}

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
          <NavigationSearch menus={menus} currentPage={page} onNavigate={setPage} />
          {/* 消息 */}
          <button
            type="button"
            className="hidden place-items-center size-9 rounded-md hover:bg-accent sm:grid"
            aria-label="通知"
            title="通知"
          >
            <Bell className="size-4.5 text-muted-foreground" />
          </button>

          {/* 当前登录用户 */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left transition-colors hover:bg-accent">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs gov-primary-gradient text-white">
                  {roleMeta.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm leading-tight md:block">
                <span className="block" style={{ fontWeight: 500 }}>{roleMeta.name}</span>
                <span className="block text-[11px] text-muted-foreground">{roleMeta.scope}</span>
              </span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="space-y-1">
                <span className="block text-sm text-foreground">当前工作身份</span>
                <span className="block text-xs font-normal text-muted-foreground">{roleMeta.name} · {roleMeta.scope}</span>
              </DropdownMenuLabel>
              {!isSupplier && (
                <div className="mx-2 mb-1 flex items-center gap-2 rounded-md bg-muted/65 px-2.5 py-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{community.name}</span>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
