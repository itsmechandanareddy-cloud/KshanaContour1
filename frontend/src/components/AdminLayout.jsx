import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { 
  LayoutDashboard, ShoppingBag, Users, Package, 
  BarChart3, Image, Star, LogOut, Menu, X, Scissors, Handshake, UserCircle
} from "lucide-react";
import { Button } from "./ui/button";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/5x4gmkkq_image.png";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { path: "/admin/customers", icon: UserCircle, label: "Customers" },
  { path: "/admin/employees", icon: Users, label: "Employees" },
  { path: "/admin/materials", icon: Package, label: "Materials" },
  { path: "/admin/reports", icon: BarChart3, label: "Reports" },
  { path: "/admin/partnership", icon: Handshake, label: "Partnership" },
  { path: "/admin/gallery", icon: Image, label: "Gallery" },
  { path: "/admin/reviews", icon: Star, label: "Reviews" },
];

const AdminLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#2D2420] z-40 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-[#FDFBF7]/70">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-['Cormorant_Garamond'] text-lg font-light text-[#FDFBF7] tracking-wide">Kshana Contour</span>
        <div className="w-9" />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen w-60 bg-[#2D2420] z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Kshana" className="w-8 h-8 object-cover opacity-80" />
                <div>
                  <p className="font-['Cormorant_Garamond'] text-lg font-light text-[#FDFBF7] tracking-wide">Kshana</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D19B5A]">Admin</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#FDFBF7]/40">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.exact} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 transition-all duration-200 text-sm ${isActive ? 'bg-white/10 text-[#FDFBF7]' : 'text-[#FDFBF7]/50 hover:text-[#FDFBF7]/80 hover:bg-white/5'}`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-light">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="px-3 py-2 mb-2">
              <p className="text-sm text-[#FDFBF7]/80 font-light">{user?.name || "Admin"}</p>
              <p className="text-xs text-[#FDFBF7]/30">{user?.phone}</p>
            </div>
            <Button onClick={handleLogout} variant="ghost"
              className="w-full justify-start gap-3 text-[#FDFBF7]/40 hover:text-[#FDFBF7]/80 hover:bg-white/5 rounded-none text-sm font-light"
              data-testid="logout-button">
              <LogOut className="w-4 h-4" />Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
