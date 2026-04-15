import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Plus, ShoppingBag, Calendar, IndianRupee, Clock,
  AlertTriangle, TrendingUp, Package, Users, Star,
  Scissors, Image as ImageIcon, FileText, BarChart3,
  ArrowRight, Eye, Printer, Handshake
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [reviewStats, setReviewStats] = useState({ total: 0, average: 0, distribution: {} });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };
      const [statsRes, chartRes, ordersRes, revRes, empRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: h }),
        axios.get(`${API}/dashboard/charts`, { headers: h }),
        axios.get(`${API}/orders`, { headers: h }),
        axios.get(`${API}/reviews/stats`).catch(() => ({ data: { total: 0, average: 0, distribution: {} } })),
        axios.get(`${API}/employees`, { headers: h }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
      setReviewStats(revRes.data);
      setEmployees(empRes.data);
    } catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  const fmt = (a) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(a || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const statusColors = {
    pending: "bg-[#C05C3B]/10 text-[#C05C3B]",
    in_progress: "bg-[#D19B5A]/10 text-[#D19B5A]",
    ready: "bg-[#7E8B76]/10 text-[#7E8B76]",
    delivered: "bg-[#2D2420]/10 text-[#2D2420]"
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-dashboard">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-[#2D2420] rounded-none -mx-6 -mt-6 px-8 py-10 lg:py-14">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #D19B5A 0.5px, transparent 0)", backgroundSize: "24px 24px" }} />
          </div>
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#D19B5A] mb-2">{today}</p>
              <h1 className="font-['Cormorant_Garamond'] text-4xl lg:text-5xl font-light text-[#FDFBF7]">
                Welcome Back
              </h1>
              <p className="text-[#FDFBF7]/40 text-sm mt-2">Kshana Contour Command Center</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/admin/orders/new")}
                className="bg-[#D19B5A] hover:bg-[#C08A4A] text-[#2D2420] rounded-none px-6 text-xs uppercase tracking-[0.1em]"
                data-testid="new-order-button">
                <Plus className="w-4 h-4 mr-2" />New Order
              </Button>
              <Button onClick={() => navigate("/admin/orders")}
                variant="outline" className="border-[#FDFBF7]/20 text-[#FDFBF7] hover:bg-[#FDFBF7]/10 rounded-none text-xs uppercase tracking-[0.1em]">
                <ShoppingBag className="w-4 h-4 mr-2" />All Orders
              </Button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-px mt-10 bg-[#FDFBF7]/10">
            {[
              { label: "Monthly Orders", value: stats?.monthly_orders || 0, icon: ShoppingBag, color: "#D19B5A" },
              { label: "Monthly Revenue", value: fmt(stats?.monthly_income || 0), icon: IndianRupee, color: "#7E8B76" },
              { label: "Weekly Orders", value: stats?.weekly_orders || 0, icon: Calendar, color: "#C05C3B" },
              { label: "Weekly Revenue", value: fmt(stats?.weekly_income || 0), icon: TrendingUp, color: "#D19B5A" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[#2D2420] p-5 lg:p-6">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#FDFBF7]/40">{label}</span>
                </div>
                <p className="font-['Cormorant_Garamond'] text-2xl lg:text-3xl font-light text-[#FDFBF7] mt-2">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Due Soon Alerts */}
        {stats?.due_soon?.length > 0 && (
          <div className="border border-[#B85450]/20 bg-[#B85450]/5 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#B85450] font-medium">Urgent Deliveries</p>
            {stats.due_soon.map((order, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#B85450]" />
                  <span className="text-sm text-[#2D2420]">
                    <span className="font-medium">#{order.order_id}</span> — {order.customer_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#B85450] font-medium">{order.days_until} day(s)</span>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/orders/${order.order_id}`)} className="text-[#B85450] hover:bg-[#B85450]/10 h-7 px-2">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Pipeline */}
        <div className="grid grid-cols-4 gap-px bg-[#2D2420]/10">
          {[
            { label: "Pending", count: stats?.pending_delivery || 0, icon: Package, bg: "bg-[#C05C3B]/5", accent: "#C05C3B", filter: "pending" },
            { label: "In Progress", count: stats?.in_progress || 0, icon: Clock, bg: "bg-[#D19B5A]/5", accent: "#D19B5A", filter: "in_progress" },
            { label: "Ready", count: stats?.ready_to_deliver || 0, icon: TrendingUp, bg: "bg-[#7E8B76]/5", accent: "#7E8B76", filter: "ready" },
            { label: "Due Soon", count: stats?.due_soon_count || 0, icon: AlertTriangle, bg: "bg-[#B85450]/5", accent: "#B85450", filter: "" },
          ].map(({ label, count, icon: Icon, bg, accent, filter }) => (
            <button key={label} onClick={() => filter && navigate("/admin/orders")} className={`${bg} p-5 lg:p-6 text-left hover:opacity-80 transition-opacity`}>
              <Icon className="w-5 h-5 mb-3" style={{ color: accent }} strokeWidth={1.5} />
              <p className="font-['Cormorant_Garamond'] text-3xl font-light text-[#2D2420]">{count}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/40 mt-1">{label}</p>
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Recent Orders */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#2D2420]">Recent Orders</h2>
              <button onClick={() => navigate("/admin/orders")} className="text-[10px] uppercase tracking-[0.15em] text-[#D19B5A] hover:text-[#C05C3B] transition-colors flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentOrders.map(order => (
                <div key={order.order_id} className="flex items-center gap-4 p-4 bg-white border border-[#EFEBE4] hover:border-[#D19B5A]/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/admin/orders/${order.order_id}`)}>
                  <div className="w-10 h-10 bg-[#2D2420] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-[#D19B5A] font-medium">{order.order_id?.split("-")[1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D2420] truncate">{order.customer_name}</p>
                    <p className="text-xs text-[#8A7D76]">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""} &middot; {fmtDate(order.delivery_date)}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium ${statusColors[order.status] || "bg-[#F7F2EB] text-[#5C504A]"}`}>
                    {order.status?.replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-[#2D2420]">{fmt(order.total)}</span>
                  <ArrowRight className="w-4 h-4 text-[#EFEBE4] group-hover:text-[#D19B5A] transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access Panel */}
          <div className="space-y-4">
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#2D2420]">Quick Access</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Orders", icon: ShoppingBag, path: "/admin/orders", color: "#C05C3B" },
                { label: "Customers", icon: Users, path: "/admin/customers", color: "#D19B5A" },
                { label: "Employees", icon: Users, path: "/admin/employees", color: "#2D2420" },
                { label: "Materials", icon: Scissors, path: "/admin/materials", color: "#7E8B76" },
                { label: "Reports", icon: BarChart3, path: "/admin/reports", color: "#D19B5A" },
                { label: "Partnership", icon: Handshake, path: "/admin/partnership", color: "#7A8B99" },
                { label: "Gallery", icon: ImageIcon, path: "/admin/gallery", color: "#C05C3B" },
                { label: "Reviews", icon: Star, path: "/admin/reviews", color: "#D19B5A" },
              ].map(({ label, icon: Icon, path, color }) => (
                <button key={label} onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-2 p-4 bg-white border border-[#EFEBE4] hover:border-[#D19B5A]/30 transition-all group">
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color }} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/60 group-hover:text-[#2D2420]">{label}</span>
                </button>
              ))}
            </div>

            {/* Review Snapshot */}
            <div className="bg-[#2D2420] p-5 cursor-pointer hover:bg-[#3D3430] transition-colors" onClick={() => navigate("/admin/reviews")}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#D19B5A]">Google Reviews</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FDFBF7]/30" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-['Cormorant_Garamond'] text-4xl font-light text-[#FDFBF7]">{reviewStats.average || "—"}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(reviewStats.average) ? "text-[#D19B5A] fill-[#D19B5A]" : "text-[#FDFBF7]/20"}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#FDFBF7]/40 mt-1">{reviewStats.total} review{reviewStats.total !== 1 ? "s" : ""}</p>
            </div>

            {/* Team */}
            <div className="bg-white border border-[#EFEBE4] p-5 cursor-pointer hover:border-[#D19B5A]/30 transition-colors" onClick={() => navigate("/admin/employees")}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76]">Team</span>
                <span className="text-xs text-[#D19B5A]">{employees.length} members</span>
              </div>
              <div className="flex -space-x-2">
                {employees.slice(0, 6).map((emp, i) => (
                  <div key={emp.id || i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: ["#C05C3B", "#D19B5A", "#7E8B76", "#7A8B99", "#2D2420", "#B85450"][i % 6], color: "#FDFBF7" }}>
                    {emp.name?.charAt(0)?.toUpperCase()}
                  </div>
                ))}
                {employees.length > 6 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#F7F2EB] flex items-center justify-center text-[10px] text-[#8A7D76] font-medium">
                    +{employees.length - 6}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-4">Monthly Orders</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE4" />
                    <XAxis dataKey="month" tick={{ fill: "#8A7D76", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#8A7D76", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#2D2420", border: "none", borderRadius: 0, color: "#FDFBF7", fontSize: 12 }} />
                    <Bar dataKey="orders" fill="#C05C3B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-4">Monthly Revenue</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE4" />
                    <XAxis dataKey="month" tick={{ fill: "#8A7D76", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#8A7D76", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#2D2420", border: "none", borderRadius: 0, color: "#FDFBF7", fontSize: 12 }} formatter={(v) => fmt(v)} />
                    <Bar dataKey="income" fill="#D19B5A" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
