import { useAuth } from "@/hooks/use-auth";
import SuperAdminDashboard from "./super-admin-dashboard";
import ClientAdminDashboard from "./client-admin-dashboard";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'client_admin':
      case 'client_user':
        return <ClientAdminDashboard />;
      default:
        return <div>Invalid user role</div>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
}
