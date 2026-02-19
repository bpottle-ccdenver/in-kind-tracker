

import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Shield,
  LogOut,
  Sun,
  Moon,
  Church,
  Building2,
  User as UserIcon,
  HandCoins,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import practicePulseLogo from "../../img/PracticePulseLogo.png";
import { AuthProvider } from "@/contexts/AuthContext";
import { RESOURCE_PERMISSIONS } from "@/permissions";
import { useTheme } from "@/contexts/ThemeContext.jsx";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Wish List",
    url: createPageUrl("WishListManagement"),
    icon: ListChecks,
  },
  {
    title: "Users",
    url: createPageUrl("UserManagement"),
    icon: Users,
  },
  {
    title: "Roles",
    url: createPageUrl("RoleManagement"),
    icon: Shield,
  },
  {
    title: "Organization",
    url: createPageUrl("OrganizationManagement"),
    icon: Building2,
  },
  {
    title: "Individual",
    url: createPageUrl("IndividualManagement"),
    icon: UserIcon,
  },
  {
    title: "Donation",
    url: createPageUrl("DonationManagement"),
    icon: HandCoins,
  },
  {
    title: "Ministries",
    url: createPageUrl("MinistryManagement"),
    icon: Church,
  },
];

const NAV_PERMISSION_RULES = {
  Dashboard: { requireAll: ["donation"] },
  "Wish List": { resource: "wish_list" },
  Users: { resource: "users" },
  Roles: { resource: "users", type: "manage" },
  Organization: { resource: "organization" },
  Individual: { resource: "individual" },
  Donation: { resource: "donation" },
  Ministries: { resource: "ministries" },
};

const PAGE_TITLE_MAP = {
  Dashboard: "Dashboard",
  WishListManagement: "Wish List",
  UserManagement: "Users",
  RoleManagement: "Roles",
  OrganizationManagement: "Organization",
  IndividualManagement: "Individual",
  DonationManagement: "Donation",
  MinistryManagement: "Ministries",
  NoAccess: "NoAccess",
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      setIsAuthLoading(true);
      try {
        const user = await User.me();

        if (!user) {
          setCurrentUser(null);
          setPermissions([]);
          if (currentPageName !== 'Login') {
            navigate(createPageUrl('Login'), { replace: true });
          }
          return;
        }

        setCurrentUser(user);
        setPermissions(Array.isArray(user.permissions) ? user.permissions : []);
      } catch (e) {
        console.error("Failed to fetch current user:", e);
        setCurrentUser(null);
        setPermissions([]);
        if (currentPageName !== 'Login') {
          navigate(createPageUrl('Login'), { replace: true });
        }
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuthAndRedirect();
  }, [currentPageName, navigate]);
  
  const handleLogout = async () => {
    try {
      await User.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setCurrentUser(null);
      setPermissions([]);
      navigate(createPageUrl('Login'), { replace: true });
    }
  };

  const permissionSet = useMemo(() => {
    return new Set(
      (permissions || [])
        .map((perm) => (typeof perm === "string" ? perm.trim().toLowerCase() : ""))
        .filter(Boolean),
    );
  }, [permissions]);

  const canAccessNavItem = useMemo(() => {
    return (title) => {
      const rule = NAV_PERMISSION_RULES[title];
      if (!rule) {
        return true;
      }
      if (rule.requireAll && Array.isArray(rule.requireAll)) {
        return rule.requireAll.every((resourceKey) => {
          const permDef = RESOURCE_PERMISSIONS[resourceKey];
          if (!permDef) return true;
          const required = [];
          if (permDef.view) required.push(permDef.view.toLowerCase());
          if (permDef.manage) required.push(permDef.manage.toLowerCase());
          if (required.length === 0) return true;
          return required.some((perm) => permissionSet.has(perm));
        });
      }

      const { resource, type = "view" } = typeof rule === "string" ? { resource: rule, type: "view" } : rule;
      const permDef = RESOURCE_PERMISSIONS[resource];
      if (!permDef) {
        return true;
      }

      const managePerm = permDef.manage ? permDef.manage.toLowerCase() : null;
      const viewPerm = permDef.view ? permDef.view.toLowerCase() : null;

      if (type === "manage") {
        if (managePerm && permissionSet.has(managePerm)) {
          return true;
        }
        return false;
      }

      if (viewPerm && permissionSet.has(viewPerm)) {
        return true;
      }
      if (managePerm && permissionSet.has(managePerm)) {
        return true;
      }
      return false;
    };
  }, [permissionSet]);

  const navigationLinks = useMemo(() => {
    const seen = new Set();
    return navigationItems.filter((item) => {
      if (seen.has(item.title)) {
        return false;
      }
      seen.add(item.title);
      return canAccessNavItem(item.title);
    });
  }, [canAccessNavItem]);

  useEffect(() => {
    if (isAuthLoading || currentPageName === "Login" || !currentUser) {
      return;
    }
    const navTitle = PAGE_TITLE_MAP[currentPageName];
    const canViewCurrent = navTitle ? canAccessNavItem(navTitle) : true;
    if (canViewCurrent) {
      return;
    }

    const defaultRouteName = currentUser?.default_route;
    if (defaultRouteName) {
      const defaultTitle = PAGE_TITLE_MAP[defaultRouteName];
      if (!defaultTitle || canAccessNavItem(defaultTitle)) {
        const defaultUrl = createPageUrl(defaultRouteName);
        if (defaultUrl && defaultUrl !== location.pathname) {
          navigate(defaultUrl, { replace: true });
          return;
        }
      }
    }

    if (navigationLinks.length === 0) {
      if (location.pathname !== createPageUrl("NoAccess")) {
        navigate(createPageUrl("NoAccess"), { replace: true });
      }
      return;
    }

    const targetUrl = navigationLinks[0].url;
    if (targetUrl && targetUrl !== location.pathname) {
      navigate(targetUrl, { replace: true });
    }
  }, [isAuthLoading, currentPageName, navigationLinks, canAccessNavItem, location.pathname, navigate, currentUser]);

  const renderSidebarContent = () => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2">
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {navigationLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                className={`hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300 transition-all duration-200 rounded-lg mb-1 ${
                  location.pathname === item.url
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300 dark:shadow'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5 transition-colors">
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <img
            src={practicePulseLogo}
            alt="In-Kind Tracker"
            className="h-12 animate-pulse object-contain"
          />
          <p className="text-slate-600 dark:text-slate-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <p className="text-slate-600 dark:text-slate-300">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <AuthProvider user={currentUser} permissions={permissions}>
      <SidebarProvider>
      <style>
        {`
          :root {
            --primary-navy: #1e293b;
            --primary-emerald: #10b981;
            --primary-amber: #f59e0b;
            --background: #fafafa;
            --surface: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border: #e2e8f0;
          }

          /* Increase opacity of all dialog overlays */
          [data-radix-dialog-overlay] {
            background-color: rgba(15, 23, 42, 0.95) !important; /* slate-900 with 95% opacity */
          }

          /* Ensure all dialog content has white background */
          [data-radix-dialog-content] {
            background-color: #ffffff !important;
          }

          .dark [data-radix-dialog-content] {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
          }
        `}
      </style>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-slate-950 transition-colors">
        <Sidebar className="border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <SidebarHeader className="border-b border-gray-200 dark:border-slate-800 p-4">
            <Link to={createPageUrl("UserManagement")} className="flex items-center">
              <div className="flex items-center gap-3">
                <img
                  src={practicePulseLogo}
                  alt="In-Kind Tracker"
                  className="h-10 object-contain"
                />
              </div>
            </Link>
          </SidebarHeader>
          
          <SidebarContent className="p-3 space-y-3 text-slate-700 dark:text-slate-200">
            {renderSidebarContent()}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Theme</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{isDarkMode ? "Dark mode" : "Light mode"}</p>
                </div>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
                aria-label={isDarkMode ? 'Disable dark mode' : 'Enable dark mode'}
                className="data-[state=unchecked]:bg-slate-300 data-[state=unchecked]:border-slate-300 dark:data-[state=unchecked]:bg-slate-700 dark:data-[state=unchecked]:border-slate-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="text-slate-600 dark:text-slate-200 font-semibold text-sm">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{currentUser?.name || "User"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex-shrink-0"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-white dark:bg-slate-950 transition-colors">
          <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors duration-200" />
              <Link to={createPageUrl("UserManagement")}>
                <img
                  src={practicePulseLogo}
                  alt="In-Kind Tracker"
                  className="h-8 object-contain"
                />
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 transition-colors">
            {children}
          </div>
        </main>
      </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
