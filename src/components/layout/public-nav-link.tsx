import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NavOption } from "@/components/layout/layout-props";
import { cn } from "@/lib/utils";

const STATIC_HREF = {
  "/": "/",
  "/posts": "/posts",
  "/friend-links": "/friend-links",
} as const;

function postSlugFromHref(href: string): string | null {
  const [path] = href.split(/[?#]/);
  const match = /^\/post\/([^/]+)\/?$/.exec(path ?? "");
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function NavLinkLabel({ option }: { option: NavOption }) {
  return (
    <>
      <span className="truncate">{option.label}</span>
      {option.external ? (
        <ExternalLink
          size={14}
          strokeWidth={1.75}
          className="ml-1 shrink-0 opacity-70"
        />
      ) : null}
    </>
  );
}

export function PublicNavLink({
  option,
  className,
  activeClassName,
  onClick,
}: {
  option: NavOption;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}) {
  const label = <NavLinkLabel option={option} />;

  if (option.external) {
    return (
      <a
        href={option.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  const slug = postSlugFromHref(option.href);
  if (slug) {
    return (
      <Link
        to="/post/$slug"
        params={{ slug }}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  const staticTo = STATIC_HREF[option.href as keyof typeof STATIC_HREF];
  if (staticTo) {
    return (
      <Link
        to={staticTo}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  return (
    <a href={option.href} className={className} onClick={onClick}>
      {label}
    </a>
  );
}

/**
 * Desktop top-level item. Renders a plain link when there are no children,
 * otherwise renders a hover/click dropdown that groups the child links.
 */
export function PublicNavMenu({
  option,
  className,
  activeClassName,
}: {
  option: NavOption;
  className?: string;
  activeClassName?: string;
}) {
  const children = option.children ?? [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (children.length === 0) {
    return (
      <PublicNavLink
        option={option}
        className={className}
        activeClassName={activeClassName}
      />
    );
  }

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={rootRef}
      className="public-nav-group"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <div className="public-nav-group-trigger" data-open={open}>
        {option.href ? (
          <PublicNavLink
            option={option}
            className={className}
            activeClassName={activeClassName}
          />
        ) : (
          <span className={cn(className, "public-nav-group-label")}>
            {option.label}
          </span>
        )}
        <button
          type="button"
          className="public-nav-group-caret"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={option.label}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>
      <div
        className="public-nav-dropdown"
        role="menu"
        data-open={open}
        aria-hidden={!open}
      >
        {children.map((child) => (
          <PublicNavLink
            key={child.id}
            option={child}
            className="public-nav-dropdown-item"
            activeClassName="public-nav-active"
            onClick={() => setOpen(false)}
          />
        ))}
      </div>
    </div>
  );
}
