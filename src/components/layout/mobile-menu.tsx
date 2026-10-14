import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/common/theme-provider";
import { ThemeToggle } from "@/components/common/theme-toggle";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { cn } from "@/lib/utils";
import { PublicNavLink } from "./public-nav-link";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale } from "@/paraglide/runtime";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
  mobile: boolean;
  isLoading?: boolean;
}

function MobileNavGroup({
  option,
  onClose,
}: {
  option: NavOption;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const children = option.children ?? [];

  return (
    <div className="public-menu-group" data-open={open}>
      <div className="public-menu-group-head">
        {option.href ? (
          <PublicNavLink
            option={{ ...option, children: undefined }}
            onClick={onClose}
            className="public-menu-item"
            activeClassName="public-menu-active"
          />
        ) : (
          <span className="public-menu-item public-menu-group-label">
            {option.label}
          </span>
        )}
        <button
          type="button"
          className="public-menu-group-toggle"
          aria-expanded={open}
          aria-label={option.label}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="public-menu-group-children" data-open={open} hidden={!open}>
        {children.map((child) => (
          <PublicNavLink
            key={child.id}
            option={child}
            onClick={onClose}
            className="public-menu-item public-menu-child"
            activeClassName="public-menu-active"
          />
        ))}
      </div>
    </div>
  );
}

/** Shared account actions; the compact navigation also includes links and preferences. */
export function MobileMenu({
  navOptions,
  onClose,
  user,
  logout,
  mobile,
  isLoading,
}: MobileMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const { userTheme } = useTheme();
  const themeLabel =
    userTheme === "light"
      ? m.theme_light()
      : userTheme === "dark"
        ? m.theme_dark()
        : m.theme_system();
  return (
    <>
      {mobile && (
        <>
          <nav className="public-menu-links">
            {navOptions.map((option) =>
              option.children && option.children.length > 0 ? (
                <MobileNavGroup
                  key={option.id}
                  option={option}
                  onClose={onClose}
                />
              ) : (
                <PublicNavLink
                  key={option.id}
                  option={option}
                  onClick={onClose}
                  className="public-menu-item"
                  activeClassName="public-menu-active"
                />
              ),
            )}
          </nav>
          <div className="public-menu-preferences">
            <ThemeToggle className="public-menu-theme" label={themeLabel} />
            <div
              className="public-menu-languages"
              role="group"
              aria-label={m.common_switch_language()}
            >
              <button
                type="button"
                aria-pressed={getLocale() === "zh"}
                onClick={() => setLocale("zh")}
              >
                中文
              </button>
              <button
                type="button"
                aria-pressed={getLocale() === "en"}
                onClick={() => setLocale("en")}
              >
                English
              </button>
            </div>
          </div>
        </>
      )}
      {isLoading ? (
        <div className="public-menu-loading" aria-busy="true">
          <span className="animate-pulse" />
        </div>
      ) : user ? (
        <>
          <div className="public-menu-identity">
            {user.image ? (
              <img src={user.image} alt="" />
            ) : (
              <UserIcon size={24} />
            )}
            <span>{user.name}</span>
          </div>
          <Link to="/profile" onClick={onClose} className="public-menu-item">
            <UserIcon size={18} />
            {m.profile_title()}
          </Link>
          {user.role === "admin" && (
            <Link to="/admin" onClick={onClose} className="public-menu-item">
              <Settings size={18} />
              {m.profile_admin_dashboard_fuwari()}
            </Link>
          )}
          <button
            type="button"
            disabled={loggingOut}
            className="public-menu-item public-menu-logout"
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
                onClose();
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            <LogOut size={18} />
            {m.profile_logout_fuwari()}
          </button>
        </>
      ) : (
        <Link
          to="/login"
          onClick={onClose}
          className="public-menu-item public-menu-active"
        >
          <UserIcon size={18} />
          {m.nav_login_register()}
        </Link>
      )}
    </>
  );
}
