import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

interface AdminSidebarProps {
  activeHref: string;
  onNavigate?: (href: string) => void;
  schoolName?: string;
  adminName?: string;
  onSignOut?: () => void;
}

const SIDEBAR_ITEMS = [
  { label: "Overview", icon: "dashboard", href: "/admin/dashboard" },
  { label: "Students", icon: "group", href: "/admin/students" },
  { label: "Teachers", icon: "school", href: "/admin/teachers" },
  { label: "Classes", icon: "class", href: "/admin/classes" },
  { label: "Timetable", icon: "calendar_month", href: "/admin/timetable" },
  { label: "Fees", icon: "payments", href: "/admin/fees" },
  { label: "Approvals", icon: "approval", href: "/admin/approvals" },
  { label: "Reports", icon: "description", href: "/admin/reports" },
  { label: "Messages", icon: "chat_bubble", href: "/admin/messages" },
  { label: "Settings", icon: "settings", href: "/admin/settings" },
];

export default function AdminSidebar({
  activeHref,
  onNavigate,
  schoolName,
  adminName,
  onSignOut,
}: AdminSidebarProps) {
  const router = useRouter();

  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      router.push(href);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-surface-container-low/80 backdrop-blur-xl border-r border-outline-variant/30 sticky top-0 px-4 py-6 gap-2">
      {/* Header section — school identity */}
      <div className="px-3 mb-6">
        {/* Brand mark — geometric E */}
        <div className="w-10 h-10 bg-primary-container rounded-[10px] flex flex-col justify-center items-center gap-[3px] mb-4">
          <div className="w-5 h-[3px] bg-white rounded-full" />
          <div className="w-3.5 h-[3px] bg-white rounded-full" />
          <div className="w-5 h-[3px] bg-white rounded-full" />
        </div>
        <h2 className="font-headline text-xl font-light italic text-primary tracking-tight truncate">
          {schoolName || "EliteSchool's"}
        </h2>
        <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
          OS — Admin Portal
        </p>
      </div>

      {/* Nav items — full admin list */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar pb-4">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeHref === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative",
                isActive
                  ? "bg-primary-container/10 text-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {/* Active blade indicator */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary-container rounded-full" />
              )}

              <span
                className="material-symbols-outlined text-[20px] flex-shrink-0"
                style={
                  isActive
                    ? { fontVariationSettings: '"FILL" 1, "wght" 300' }
                    : { fontVariationSettings: '"FILL" 0, "wght" 300' }
                }
              >
                {item.icon}
              </span>

              <span className="font-body text-sm font-light truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Divider between main nav and bottom actions */}
      <div className="mt-auto pt-4 border-t border-outline-variant/30 space-y-1">
        {/* Admin profile row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
            <span className="font-label text-[11px] text-white uppercase">
              {adminName?.charAt(0) || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-medium text-on-surface truncate">
              {adminName || "Administrator"}
            </p>
            <p className="font-label text-[9px] uppercase tracking-[0.1em] text-outline">
              Admin
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-outline hover:text-error hover:bg-error/5 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-body text-sm font-light">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
