
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarNavItem as SidebarItemComponent } from "@/components/SidebarNavItem";
import {
  LayoutDashboard,
  ExternalLink,
  Users,
  LogOut,
  Menu,
  X,
  ClipboardList
} from "lucide-react";

type SidebarNavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  external?: boolean; 
};

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    href: "/dashboard/patients",
    icon: Users,
  },
  {
    title: "Nurses",
    href: "/dashboard/nurses",
    icon: ClipboardList,
  },
  {
    title: "Buy More Products",
    href: "https://www.spongehydration.com/products-1",
    icon: ExternalLink,
    external: true,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen ? (
            <h1 className="text-xl font-bold">Sponge Hydration</h1>
          ) : (
            <span className="mx-auto font-bold">SH</span>
          )}
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1">
          {sidebarNavItems.map((item) => (
            <SidebarItemComponent
              key={item.href}
              title={item.title}
              href={item.href}
              icon={item.icon}
              external={(item as any).external} 
              sidebarOpen={sidebarOpen}
            />
          ))}
        </div>

        <div className="p-4 border-t">
          <div className={`flex ${!sidebarOpen && 'flex-col'} items-center`}>
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.email || 'User'}</p>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              className={`text-red-500 hover:text-red-700 hover:bg-red-50 ${sidebarOpen ? 'ml-auto' : 'mt-2 mx-auto'}`}
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
