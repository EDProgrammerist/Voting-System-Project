// Local uploads must use the Vite proxy when a phone opens the development site.
export function voterMediaUrl(value: string): string {
  if (!import.meta.env.DEV) return value;
  try {
    const url = new URL(value);
    const local =
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname.startsWith("127.") ||
      url.hostname === "[::1]";
    if (local && url.pathname.startsWith("/storage/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Relative URLs already use the website's origin.
  }
  return value;
}
