// 盘古后端 API 封装层 —— 原生 fetch，无第三方依赖。
// 统一解 Result 信封 {code,msg,data,errorType,needRetry}，注入 Bearer token。
// 仅 401（未认证 / token 失效）触发登出；403（已认证但当前角色/状态无权）退回业务错误流，
// 由调用处 toast 提示，避免「业务级权限失败 → 误踢下线」（如撤回非本人草稿）。

import { getToken, clearSession } from "./auth";

const BASE = "/pangu/api/v1";

/** 后端业务错误（code !== 200），携带后端 msg / errorType 供 UI 展示。 */
export class ApiError extends Error {
  code: number;
  errorType?: string;
  needRetry?: boolean;
  constructor(code: number, msg: string, errorType?: string, needRetry?: boolean) {
    super(msg);
    this.name = "ApiError";
    this.code = code;
    this.errorType = errorType;
    this.needRetry = needRetry;
  }
}

// 401 时由 store 注册的登出回调（清会话 + 回登录页），避免本层直接依赖 React。
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** 是否注入 Authorization 头，默认 true；登录接口传 false。 */
  auth?: boolean;
  /** 显式业务会话令牌；用于不污染管理端登录态的注册申请等独立流程。 */
  token?: string;
  /** 独立会话失效时不清理管理端登录态。 */
  isolatedAuth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, token, isolatedAuth = false } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const authToken = token ?? getToken();
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(-1, "网络异常，请检查后端服务是否启动", "NETWORK", true);
  }

  // 仅 401 视为鉴权失效：清会话并跳登录。403 落入下方业务错误流（弹后端 msg）。
  if (resp.status === 401) {
    if (!isolatedAuth) {
      clearSession();
      onUnauthorized?.();
    }
    throw new ApiError(resp.status, "登录已失效，请重新登录", "AUTH", false);
  }

  let payload: { code: number; msg?: string; data?: T; errorType?: string; needRetry?: boolean };
  try {
    payload = await resp.json();
  } catch (e) {
    throw new ApiError(resp.status, "响应解析失败", "PARSE", true);
  }

  if (payload.code !== 200) {
    throw new ApiError(payload.code, payload.msg ?? "请求失败", payload.errorType, payload.needRetry);
  }
  return payload.data as T;
}

/**
 * 创建独立 Bearer 会话客户端。
 *
 * 小区注册使用 C 端短信身份，但页面与 B/G/S 管理端共享前端工程。独立客户端避免
 * 注册令牌覆盖管理端 session，也避免注册令牌失效时误退出已登录的工作身份。
 */
export function createTokenApi(token: string) {
  const auth = { token, isolatedAuth: true } as const;
  return {
    get: <T>(path: string) => request<T>(path, { method: "GET", ...auth }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body, ...auth }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body, ...auth }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE", ...auth }),
    upload: <T>(path: string, formData: FormData) => upload<T>(path, formData, token, true),
  };
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, opts?: { auth?: boolean }): Promise<T> {
  return request<T>(path, { method: "POST", body, auth: opts?.auth });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

async function upload<T>(
  path: string,
  formData: FormData,
  explicitToken?: string,
  isolatedAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = explicitToken ?? getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let resp: Response;
  try {
    resp = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
  } catch {
    throw new ApiError(-1, "网络异常，请检查后端服务是否启动", "NETWORK", true);
  }
  if (resp.status === 401) {
    if (!isolatedAuth) {
      clearSession();
      onUnauthorized?.();
    }
    throw new ApiError(resp.status, "登录已失效，请重新登录", "AUTH", false);
  }
  let payload: { code: number; msg?: string; data?: T; errorType?: string; needRetry?: boolean };
  try {
    payload = await resp.json();
  } catch {
    throw new ApiError(resp.status, "响应解析失败", "PARSE", true);
  }
  if (payload.code !== 200) {
    throw new ApiError(payload.code, payload.msg ?? "上传失败", payload.errorType, payload.needRetry);
  }
  return payload.data as T;
}

export function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return upload<T>(path, formData);
}
