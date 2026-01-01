import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { DashboardBackground } from "~/components/DashboardBackground";
import { AppSidebar } from "~/components/AppSidebar";
import { DashboardHeader } from "~/components/DashboardHeader";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/dashboard" },
      });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardBackground />
        <DashboardHeader />
        <div className="flex-1 overflow-auto relative z-10">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
