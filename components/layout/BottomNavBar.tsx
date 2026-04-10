import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export interface BottomNavBarProps {
  items: NavItem[];
  activeHref: string;
  onNavigate?: (href: string) => void;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Overview",  icon: "dashboard",     href: "/admin/dashboard" },
  { label: "Students",  icon: "group",          href: "/admin/students" },
  { label: "Fees",      icon: "payments",       href: "/admin/fees" },
  { label: "Messages",  icon: "chat_bubble",    href: "/admin/messages" },
  { label: "More",      icon: "apps",           href: "/admin/more" },
];

export const ADMIN_MORE_ITEMS = [
  { label: "Teachers",  icon: "school",          href: "/admin/teachers" },
  { label: "Classes",   icon: "class",           href: "/admin/classes" },
  { label: "Timetable", icon: "calendar_month",  href: "/admin/timetable" },
  { label: "Approvals", icon: "approval",        href: "/admin/approvals" },
  { label: "Reports",   icon: "bar_chart",       href: "/admin/reports" },
  { label: "Settings",  icon: "settings",        href: "/admin/settings" },
  { label: "AI",        icon: "auto_awesome",    href: "/admin/ai-assistant" },
  { label: "Profile",   icon: "person",          href: "/admin/profile" },
];

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "home", href: "/teacher/dashboard" },
  { label: "Attendance", icon: "how_to_reg", href: "/teacher/attendance" },
  { label: "Grades", icon: "military_tech", href: "/teacher/grades" },
  { label: "Messages", icon: "chat_bubble", href: "/teacher/messages" },
  { label: "More", icon: "apps", href: "/teacher/more" },
];

export const TEACHER_MORE_ITEMS = [
  { label: "Timetable", icon: "calendar_month", href: "/teacher/timetable" },
  { label: "Settings", icon: "settings", href: "/teacher/settings" },
  { label: "Profile", icon: "person", href: "/teacher/profile" },
];

export const PARENT_NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "home", href: "/parent/dashboard" },
  { label: "Fees", icon: "payments", href: "/parent/fees" },
  { label: "Reports", icon: "description", href: "/parent/reports" },
  { label: "Messages", icon: "chat_bubble", href: "/parent/messages" },
  { label: "More", icon: "apps", href: "/parent/more" },
];

export const PARENT_MORE_ITEMS = [
  { label: "Timetable", icon: "calendar_month", href: "/parent/timetable" },
  { label: "Settings", icon: "settings", href: "/parent/settings" },
  { label: "Profile", icon: "person", href: "/parent/profile" },
];

export default function BottomNavBar({
  items,
  activeHref,
  onNavigate,
}: BottomNavBarProps) {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const isTeacher = activeHref.startsWith("/teacher");
  const isParent = activeHref.startsWith("/parent");
  const currentMoreItems = isTeacher ? TEACHER_MORE_ITEMS : isParent ? PARENT_MORE_ITEMS : ADMIN_MORE_ITEMS;
  const moreHref = isTeacher ? "/teacher/more" : isParent ? "/parent/more" : "/admin/more";

  const handleNavigate = (href: string) => {
    if (href === "/admin/more" || href === "/teacher/more" || href === "/parent/more") {
      setShowMore(prev => !prev);
      return;
    }
    if (onNavigate) {
      onNavigate(href);
    } else {
      router.push(href);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F4F2ED]/95 dark:bg-[#141416]/95 backdrop-blur-xl border-t border-outline-variant/30 px-1 pb-6 pt-2 flex items-center justify-between">
        {items.map((item) => {
          const isMoreItemActive = currentMoreItems.some(m => m.href === activeHref);
          const isActive = activeHref === item.href || (item.href === moreHref && (showMore || isMoreItemActive));

        return (
          <button
            key={item.href}
            className={cn(
              "flex flex-col items-center justify-center px-2 sm:px-4 py-2 rounded-2xl gap-1 transition-all duration-200 relative flex-1",
              isActive && "bg-primary-container/10"
            )}
            onClick={() => handleNavigate(item.href)}
          >
            {/* Icon */}
            <span
              className={cn(
                "material-symbols-outlined text-[22px] transition-colors duration-200",
                isActive ? "text-primary-container" : "text-outline"
              )}
              style={
                isActive
                  ? { fontVariationSettings: '"FILL" 1, "wght" 300' }
                  : undefined
              }
              data-icon={item.icon}
            >
              {item.icon}
            </span>

            {/* Label */}
            <span
              className={cn(
                "font-label text-[10px] uppercase tracking-[0.05em] transition-colors duration-200",
                isActive ? "text-primary-container font-medium" : "text-outline"
              )}
            >
              {item.label}
            </span>

            {/* Badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <div className="absolute top-1 right-3 min-w-[18px] h-[18px] px-1 bg-primary-container text-white rounded-full font-label text-[9px] flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </div>
            )}
          </button>
        );
      })}
      </nav>

      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          {/* Drawer */}
          <div className="fixed bottom-[76px] left-3 right-3 z-50
                          bg-surface-container-lowest/98 backdrop-blur-xl
                          rounded-2xl border border-outline-variant/30
                          shadow-[0_-8px_32px_rgba(20,20,22,0.12)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label text-[10px] uppercase
                               tracking-[0.15em] text-outline">
                All Modules
              </span>
              <button
                onClick={() => setShowMore(false)}
                className="w-6 h-6 rounded-full bg-surface-container
                           flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-outline">
                  close
                </span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {currentMoreItems.map(item => (
                <button
                  key={item.href}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(item.href);
                    } else {
                      router.push(item.href);
                    }
                    setShowMore(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3
                              rounded-xl transition-all duration-200
                              ${activeHref === item.href
                                ? "bg-primary-container/10"
                                : "hover:bg-surface-container"}`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={activeHref === item.href
                      ? { fontVariationSettings: '"FILL" 1, "wght" 300',
                          color: "#2b4d5a" }
                      : { fontVariationSettings: '"FILL" 0, "wght" 300',
                          color: "#72787b" }}
                  >
                    {item.icon}
                  </span>
                  <span className={`font-label text-[9px] uppercase tracking-[0.05em]
                                    text-center leading-tight
                                    ${activeHref === item.href
                                      ? "text-primary-container font-medium"
                                      : "text-outline"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
