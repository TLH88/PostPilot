import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  Megaphone,
  Settings,
  Shield,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { verifyAdmin } from "@/lib/supabase/admin";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usage", label: "AI Usage", icon: Activity },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/system", label: "System", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdmin();

  if (!admin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-56 border-r bg-sidebar flex flex-col">
        <div className="flex h-14 items-center gap-2 px-4">
          <Shield className="size-5 text-red-500" />
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            System Admin
          </span>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 px-2 py-3">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="px-2 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 p-6">
        <div className="fixed top-4 right-6 z-30">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
