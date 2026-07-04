import { apiGet } from "./api";

export interface NavPage {
  id: string;
  label: string;
  order: number;
}
export interface NavModule {
  id: string;
  label: string;
  icon: string | null;
  order: number;
  pages: NavPage[];
}

export function listNavigationMenus(): Promise<NavModule[]> {
  return apiGet<NavModule[]>("/auth/menus");
}

export function firstPageId(menus: NavModule[]): string | null {
  return menus[0]?.pages[0]?.id ?? null;
}

export function hasPage(menus: NavModule[], pageId: string): boolean {
  return menus.some((module) => module.pages.some((page) => page.id === pageId));
}
