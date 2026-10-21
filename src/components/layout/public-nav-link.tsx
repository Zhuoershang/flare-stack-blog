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
  dataMenuitem,
}: {
  option: NavOption;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
  /** Shared id of the currently open dropdown; controlled by the navbar. */
  openId?: string | null;
  onOpenIdChange?: (openId: string | null) => void;
  /** Marks rendered anchors as menu items (keyboard focus targets). */
  dataMenuitem?: boolean;
}) {
  if (option.children && option.children.length > 0) {
    if (!onOpenIdChange) {
      throw new Error(
        "PublicNavLink: dropdown items require onOpenIdChange",
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

  const menuProps = dataMenuitem
    ? ({ "data-menuitem": true, tabIndex: -1 } as const)
    : {};

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
        {...menuProps}
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
        {...menuProps}
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
        {...menuProps}
      >
        {label}
      </Link>
    );
  }

  return (
    <a href={option.href} className={className} onClick={onClick} {...menuProps}>
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
      dataMenuitem
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node))
        onOpenChange(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open, onOpenChange]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) onOpenChange(true);
      requestAnimationFrame(() => {
        rootRef.current
          ?.querySelectorAll<HTMLElement>(".public-nav-dropdown-item")
          .forEach((item, index, items) => {
            if (index === 0) item.focus({ preventScroll: true });
            void items;
          });
      });
    }
  };

  const handlePanelKeyDown = (event: React.KeyboardEvent) => {
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(
        ".public-nav-dropdown-item",
      ) ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1 + items.length) % items.length]?.focus({
        preventScroll: true,
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus({
        preventScroll: true,
      });
    }
  };

  return (
    <div
      ref={rootRef}
      className="public-nav-dropdown"
      data-open={open}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${className ?? ""} public-nav-dropdown-trigger`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="truncate">{option.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className="public-nav-dropdown-chevron"
        />
      </button>
      {open && (
        <div
          className="public-nav-dropdown-panel"
          role="menu"
          onKeyDown={handlePanelKeyDown}
        >
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
