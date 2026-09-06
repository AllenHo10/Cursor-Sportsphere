const FALLBACK_PATH = "/dashboard";

export function safeInternalPath(value: string | null | undefined): string {
  if (!value) {
    return FALLBACK_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return FALLBACK_PATH;
  }

  try {
    const url = new URL(value, "http://sportsphere.local");
    if (url.origin !== "http://sportsphere.local") {
      return FALLBACK_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return FALLBACK_PATH;
  }
}
