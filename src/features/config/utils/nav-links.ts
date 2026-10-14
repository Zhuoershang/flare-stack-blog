export const NAV_LINKS_MAX = 8;
export const NAV_CHILDREN_MAX = 8;
export const NAV_LINK_LABEL_MAX = 20;

export type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

export function isExternalNavHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isInternalNavHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function isNavHref(href: string): boolean {
  return isInternalNavHref(href) || isExternalNavHref(href);
}

function looksLikeHost(value: string): boolean {
  if (!value || value.includes(" ") || value.includes("://")) return false;
  if (value.startsWith(".") || value.startsWith("/")) return false;
  if (/^localhost([:/?#]|$)/i.test(value)) return true;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([:/?#]|$)/i.test(
    value,
  );
}

export function canonicalizeNavHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (isInternalNavHref(trimmed) || isExternalNavHref(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (looksLikeHost(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function normalizeNavLink(value: unknown): NavLink | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    label?: unknown;
    href?: unknown;
    children?: unknown;
  };
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const href = canonicalizeNavHref(
    typeof record.href === "string" ? record.href : "",
  );
  if (!label) return null;

  const children = normalizeNavLinks(record.children, NAV_CHILDREN_MAX);
  const hasHref = isNavHref(href);
  // A parent may act as a pure group (no own link) as long as it has children.
  if (!hasHref && children.length === 0) return null;

  const link: NavLink = {
    label: label.slice(0, NAV_LINK_LABEL_MAX),
    href: hasHref ? href : "",
  };
  if (children.length > 0) link.children = children;
  return link;
}

export function normalizeNavLinks(
  value: unknown,
  max: number = NAV_LINKS_MAX,
): NavLink[] {
  if (!Array.isArray(value)) return [];

  const links: NavLink[] = [];
  for (const item of value) {
    const link = normalizeNavLink(item);
    if (!link) continue;
    links.push(link);
    if (links.length >= max) break;
  }
  return links;
}
