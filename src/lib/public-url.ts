const PUBLISHED_APP_ORIGIN = "https://clinica-estetica-br.lovable.app";

export function publicAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return `${window.location.origin}${normalizedPath}`;
  }

  return `${PUBLISHED_APP_ORIGIN}${normalizedPath}`;
}