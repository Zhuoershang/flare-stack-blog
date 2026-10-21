import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/common/theme-provider";
import { ThemeToggle } from "@/components/common/theme-toggle";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PublicNavLink } from "./public-nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale } from "@/paraglide/runtime";

function NavAccordionGroup({
  option,
  open,
  onOpenChange,
  onClose,
}: {
  option: NavOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="public-menu-group" data-open={open}>
      <button
        type="button"
        className="public-menu-item public-menu-group-trigger"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className="truncate">{option.label}</span>
        <ChevronDown size={16} className="public-menu-group-chevron" />
      </button>
      {open && (
        <div className="public-menu-group-items">
          {option.children?.map((child) => (
            <PublicNavLink
              key={child.id}
              option={child}
              onClick={onClose}
              className="public-menu-item public-menu-subitem"
              activeClassName="public-menu-active"
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
  mobile: boolean;
  isLoading?: boolean;
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
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
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
                <NavAccordionGroup
                  key={option.id}
                  option={option}
                  open={openGroupId === option.id}
                  onOpenChange={(open) =>
                    setOpenGroupId(open ? option.id : null)
                  }
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
            <SegmentedControl
              className="public-menu-languages"
              aria-label={m.common_switch_language()}
              track={false}
              size="sm"
              value={getLocale()}
              onValueChange={(locale) => setLocale(locale)}
              items={[
                { value: "zh", label: "中文" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </>
      )}
      {isLoading ? (
        <div className="public-menu-loading" aria-busy="true">
          <Skeleton className="h-6" />
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
