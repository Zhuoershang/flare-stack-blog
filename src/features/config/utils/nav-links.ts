export const NAV_LINKS_MAX = 8;
export const NAV_LINK_CHILDREN_MAX = 8;
export const NAV_LINK_DEPTH_MAX = 2;
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

type NavLinkRecord = {
  label?: unknown;
  href?: unknown;
  children?: unknown;
};

function normalizeNavLink(
  item: NavLinkRecord | undefined,
  depth: number,
): NavLink | null {
  if (!item || typeof item !== "object") return null;
  if (depth >= NAV_LINK_DEPTH_MAX) return null;
  const label = typeof item.label === "string" ? item.label.trim() : "";
  const href = canonicalizeNavHref(
    typeof item.href === "string" ? item.href : "",
  );
  if (!label || !isNavHref(href)) return null;
  const link: NavLink = {
    label: label.slice(0, NAV_LINK_LABEL_MAX),
    href,
  };
  const children: NavLink[] = [];
  if (Array.isArray(item.children)) {
    for (const child of item.children) {
      if (children.length >= NAV_LINK_CHILDREN_MAX) break;
      const normalized = normalizeNavLink(child as NavLinkRecord, depth + 1);
      if (normalized) children.push(normalized);
    }
  }
  if (children.length > 0) link.children = children;
  return link;
}

export function normalizeNavLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];

  const links: NavLink[] = [];
  for (const item of value) {
    if (links.length >= NAV_LINKS_MAX) break;
    const link = normalizeNavLink(item as NavLinkRecord, 0);
    if (link) links.push(link);
  }
  return links;
}
