import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import type { NavOption } from "@/components/layout/layout-props";

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

export function PublicNavLink({
  option,
  className,
  activeClassName,
  onClick,
  openId,
  onOpenIdChange,
}: {
  option: NavOption;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
  /** Shared id of the currently open dropdown; controlled by the navbar. */
  openId?: string | null;
  onOpenIdChange?: (openId: string | null) => void;
}) {
  if (option.children && option.children.length > 0) {
    if (!openId || !onOpenIdChange) {
      throw new Error(
        "PublicNavLink: dropdown items require openId and onOpenIdChange",
      );
    }
    return (
      <NavDropdown
        option={option}
        className={className}
        onClick={onClick}
        open={openId === option.id}
        onOpenChange={(open) => onOpenIdChange(open ? option.id : null)}
      />
    );
  }

  const label = (
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

/** Leaf link inside a dropdown panel — submenus only nest one level deep. */
function DropdownLeaf({
  option,
  className,
  onClick,
}: {
  option: NavOption;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <PublicNavLink
      option={{ ...option, children: undefined }}
      className={className}
      onClick={onClick}
    />
  );
}

function NavDropdown({
  option,
  className,
  onClick,
  open,
  onOpenChange,
}: {
  option: NavOption;
  className?: string;
  onClick?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node))
        onOpenChange(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className="public-nav-dropdown"
      data-open={open}
    >
      <button
        type="button"
        className={`${className ?? ""} public-nav-dropdown-trigger`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
      >
        <span className="truncate">{option.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className="public-nav-dropdown-chevron"
        />
      </button>
      {open && (
        <div className="public-nav-dropdown-panel" role="menu">
          {option.children?.map((child) => (
            <DropdownLeaf
              key={child.id}
              option={child}
              className="public-nav-dropdown-item"
              onClick={() => {
                onOpenChange(false);
                onClick?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
