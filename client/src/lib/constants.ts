const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_API_PORT = "3001";

function isLoopbackHost(hostname: string | null | undefined): boolean {
  return Boolean(hostname) && LOOPBACK_HOSTS.has(String(hostname).toLowerCase());
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return configuredBaseUrl || `http://localhost:${DEFAULT_API_PORT}/api`;
  }

  const inferredBaseUrl = `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}/api`;
  if (!configuredBaseUrl) {
    return inferredBaseUrl;
  }

  try {
    const parsed = new URL(configuredBaseUrl, window.location.origin);
    if (!isLoopbackHost(parsed.hostname) || isLoopbackHost(window.location.hostname)) {
      return trimTrailingSlash(parsed.toString());
    }
    parsed.hostname = window.location.hostname;
    if (!parsed.port) {
      parsed.port = DEFAULT_API_PORT;
    }
    return trimTrailingSlash(parsed.toString());
  } catch {
    return configuredBaseUrl;
  }
}

// 开发环境优先把 API 指向当前页面所在主机，避免局域网访问时仍被锁到 localhost。
export const API_BASE_URL = resolveApiBaseUrl();

const DEFAULT_API_TIMEOUT_MS = 10 * 60 * 1000;

function parseApiTimeoutMs(rawValue: string | undefined): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_API_TIMEOUT_MS;
  }
  return Math.floor(parsed);
}

export const API_TIMEOUT_MS = parseApiTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS);
