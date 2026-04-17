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
  ArrowRight, Eye, Printer, Handshake, Download, RefreshCw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [openStatusMenu, setOpenStatusMenu] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchExportData = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API}/export/all-data`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  };

  const saveExcel = (sheets, filename) => {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    });
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), filename);
  };

  const exportOrders = async (filterStatus) => {
    setExporting("orders");
    try {
      const { orders } = await fetchExportData();
      let filtered = orders;
      if (filterStatus) filtered = orders.filter(o => o.status === filterStatus);
      const rows = filtered.map(o => ({
        "Order ID": o.order_id, "Customer": o.customer_name, "Phone": o.customer_phone,
        "Status": o.status, "Items": o.items?.length || 0,
        "Subtotal": o.subtotal || 0, "Tax %": o.tax_percentage || 0, "Total": o.total || 0,
        "Paid": (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0),
        "Balance": o.balance || 0, "Order Date": o.created_at?.split("T")[0] || "",
        "Delivery Date": o.delivery_date?.split("T")[0] || "", "Description": o.description || ""
      }));
      saveExcel([{ name: "Orders", data: rows }], `Kshana_Orders_${filterStatus || "All"}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${rows.length} orders exported`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(""); }
  };

  const exportEmployees = async () => {
    setExporting("employees");
    try {
      const { employees: emps } = await fetchExportData();
      const empRows = emps.map(e => ({
        "Name": e.name, "Role": e.role, "Phone": e.phone,
        "Pay Type": e.pay_type || "", "Salary": e.salary || 0,
        "Total Payments": (e.payments || []).reduce((s, p) => s + (p.amount || 0), 0),
        "Total Hours": (e.payments || []).reduce((s, p) => s + (p.hours || 0), 0)
      }));
      const payRows = [];
      emps.forEach(e => {
        (e.payments || []).forEach(p => {
          payRows.push({
            "Employee": e.name, "Role": e.role, "Amount": p.amount || 0,
            "Hours": p.hours || 0, "Date": p.date || "", "Mode": p.mode || "",
            "Order ID": p.order_id || "", "Item": p.item_index != null ? `Item ${p.item_index + 1}` : "",
            "Notes": p.notes || ""
          });
        });
      });
      saveExcel([
        { name: "Employees", data: empRows },
        { name: "Employee Payments", data: payRows }
      ], `Kshana_Employees_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Employees exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(""); }
  };

  const exportPartnership = async () => {
    setExporting("partnership");
    try {
      const { partnership } = await fetchExportData();
      const rows = partnership.map(e => ({
        "Date": e.date || "", "Reason": e.reason || "", "Paid To": e.paid_to || "",
        "Chandana Invested": e.chandana || 0, "Akanksha Invested": e.akanksha || 0,
        "SBI Account Paid": e.sbi || 0, "Mode": e.mode || "", "UPI ID": e.upi_id || "",
        "Comments": e.comments || ""
      }));
      saveExcel([{ name: "Partnership", data: rows }], `Kshana_Partnership_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Partnership exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(""); }
  };

  const exportIncomingPayments = async () => {
    setExporting("incoming");
    try {
      const { orders } = await fetchExportData();
      const rows = [];
      orders.forEach(o => {
        (o.payments || []).forEach(p => {
          rows.push({
            "Order ID": o.order_id, "Customer": o.customer_name, "Phone": o.customer_phone,
            "Amount": p.amount || 0, "Date": p.date || "", "Mode": p.mode || "",
            "Notes": p.notes || ""
          });
        });
      });
      rows.sort((a, b) => (b.Date || "").localeCompare(a.Date || ""));
      saveExcel([{ name: "Incoming Payments", data: rows }], `Kshana_Incoming_Payments_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${rows.length} incoming payments exported`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(""); }
  };

  const exportOutgoingPayments = async () => {
    setExporting("outgoing");
    try {
      const { employees: emps, materials } = await fetchExportData();
      const rows = [];
      emps.forEach(e => {
        (e.payments || []).forEach(p => {
          rows.push({
            "Type": "Employee Payment", "To": e.name, "Reason": `${e.role} - ${p.notes || "Payment"}`,
            "Order ID": p.order_id || "", "Amount": p.amount || 0,
            "Date": p.date || "", "Mode": p.mode || ""
          });
        });
      });
      materials.forEach(m => {
        rows.push({
          "Type": "Material Purchase", "To": m.supplier || m.name,
          "Reason": m.name, "Order ID": "", "Amount": m.cost || 0,
          "Date": m.purchase_date || "", "Mode": m.payment_mode || ""
        });
      });
      rows.sort((a, b) => (b.Date || "").localeCompare(a.Date || ""));
      saveExcel([{ name: "Outgoing Payments", data: rows }], `Kshana_Outgoing_Payments_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${rows.length} outgoing payments exported`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(""); }
  };

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };
      const [statsRes, chartRes, empRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: h }),
        axios.get(`${API}/dashboard/charts`, { headers: h }),
        axios.get(`${API}/employees`, { headers: h }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
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
            {(() => {
              const now = new Date();
              const monthName = now.toLocaleDateString("en-IN", { month: "long" });
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay() + 1);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const wsFmt = `${String(weekStart.getDate()).padStart(2,"0")}/${String(weekStart.getMonth()+1).padStart(2,"0")}`;
              const weFmt = `${String(weekEnd.getDate()).padStart(2,"0")}/${String(weekEnd.getMonth()+1).padStart(2,"0")}`;
              return [
                { label: `${monthName} Orders`, value: stats?.monthly_orders || 0, icon: ShoppingBag, color: "#D19B5A" },
                { label: `${monthName} Revenue`, value: fmt(stats?.monthly_income || 0), icon: IndianRupee, color: "#7E8B76" },
                { label: `${wsFmt} - ${weFmt} Orders`, value: stats?.weekly_orders || 0, icon: Calendar, color: "#C05C3B" },
                { label: `${wsFmt} - ${weFmt} Revenue`, value: fmt(stats?.weekly_income || 0), icon: TrendingUp, color: "#D19B5A" },
              ];
            })().map(({ label, value, icon: Icon, color }) => (
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
            {stats.due_soon.map((order, idx) => {
              const statusConfig = {
                pending: { label: "Pending", color: "#C05C3B", bg: "bg-[#C05C3B]" },
                in_progress: { label: "In Progress", color: "#D19B5A", bg: "bg-[#D19B5A]" },
                ready: { label: "Ready", color: "#7E8B76", bg: "bg-[#7E8B76]" },
                delivered: { label: "Delivered", color: "#2D2420", bg: "bg-[#2D2420]" },
              };
              const current = statusConfig[order.status] || statusConfig.pending;
              const isOpen = openStatusMenu === order.order_id;

              return (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-[#B85450]" />
                    <span className="text-sm text-[#2D2420]">
                      <span className="font-medium">#{order.order_id}</span> — {order.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#B85450] font-medium">{order.days_until} day(s)</span>
                    {/* Status dot with popover */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenStatusMenu(isOpen ? null : order.order_id); }}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[#EFEBE4] bg-white hover:shadow-md transition-all"
                        data-testid={`urgent-status-${order.order_id}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${current.bg}`} />
                        <span className="text-[10px] uppercase tracking-wider text-[#5C504A]">{current.label}</span>
                      </button>
                      {isOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenStatusMenu(null)} />
                          <div className="absolute right-0 top-9 z-50 bg-white border border-[#EFEBE4] shadow-xl rounded-sm overflow-hidden min-w-[140px] animate-fade-in">
                            {Object.entries(statusConfig).map(([key, cfg]) => (
                              <button key={key}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenStatusMenu(null);
                                  if (key === order.status) return;
                                  try {
                                    const token = localStorage.getItem("token");
                                    await axios.put(`${API}/orders/${order.order_id}/status?status=${key}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                    toast.success(`${order.order_id} → ${cfg.label}`);
                                    fetchAll();
                                  } catch { toast.error("Failed"); }
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F7F2EB] transition-colors ${key === order.status ? "bg-[#F7F2EB]" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                                <span className="text-xs text-[#2D2420]">{cfg.label}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/orders/${order.order_id}`)} className="text-[#B85450] hover:bg-[#B85450]/10 h-7 px-2">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
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

        {/* Financial Overview */}
        <div className="bg-white border border-[#EFEBE4] p-6" data-testid="financial-overview">
          <div className="flex items-center gap-3 mb-5">
            <IndianRupee className="w-5 h-5 text-[#D19B5A]" strokeWidth={1.5} />
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#2D2420]">Financial Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-[#7E8B76]/10 rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">Total Income</p>
              <p className="font-['Cormorant_Garamond'] text-xl font-medium text-[#7E8B76]">{fmt(stats?.total_income || 0)}</p>
            </div>
            <div className="p-4 bg-[#7A8B99]/10 rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">SBI Outgoing</p>
              <p className="font-['Cormorant_Garamond'] text-xl font-medium text-[#7A8B99]">{fmt(stats?.total_outgoing_sbi || 0)}</p>
            </div>
            <div className={`p-4 rounded-sm ${(stats?.net_profit || 0) >= 0 ? "bg-[#7E8B76]/10" : "bg-[#B85450]/10"}`}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">Net Profit</p>
              <p className={`font-['Cormorant_Garamond'] text-xl font-bold ${(stats?.net_profit || 0) >= 0 ? "text-[#7E8B76]" : "text-[#B85450]"}`}>{fmt(stats?.net_profit || 0)}</p>
            </div>
            <div className="p-4 bg-[#C05C3B]/10 rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">Chandana Invested</p>
              <p className="font-['Cormorant_Garamond'] text-xl font-medium text-[#C05C3B]">{fmt(stats?.total_invested_chandana || 0)}</p>
            </div>
            <div className="p-4 bg-[#D19B5A]/10 rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">Akanksha Invested</p>
              <p className="font-['Cormorant_Garamond'] text-xl font-medium text-[#D19B5A]">{fmt(stats?.total_invested_akanksha || 0)}</p>
            </div>
            <div className="p-4 bg-[#B85450]/10 rounded-sm">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-1">Balance Due</p>
              <p className="font-['Cormorant_Garamond'] text-xl font-medium text-[#B85450]">{fmt(stats?.total_balance_due || 0)}</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-1 gap-6">

          {/* Quick Access Panel */}
          <div className="space-y-4">
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#2D2420]">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
        {/* Export Center */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-5 h-5 text-[#D19B5A]" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] font-semibold">Export Center</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Orders */}
              <div className="p-4 bg-[#F7F2EB] space-y-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#2D2420] font-semibold">Orders</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => exportOrders(null)} disabled={exporting === "orders"}
                    className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white text-[10px] uppercase tracking-wider h-8 rounded-none" data-testid="export-all-orders">
                    {exporting === "orders" ? "..." : "All Orders"}
                  </Button>
                  {["pending", "in_progress", "ready", "delivered"].map(s => (
                    <Button key={s} size="sm" variant="outline" onClick={() => exportOrders(s)} disabled={!!exporting}
                      className="text-[10px] uppercase tracking-wider h-8 rounded-none border-[#2D2420]/15 hover:bg-[#2D2420] hover:text-white">
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Employees */}
              <div className="p-4 bg-[#F7F2EB] space-y-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#2D2420] font-semibold">Employees</p>
                <Button size="sm" onClick={exportEmployees} disabled={exporting === "employees"}
                  className="bg-[#2D2420] hover:bg-[#2D2420]/80 text-white text-[10px] uppercase tracking-wider h-8 rounded-none w-full" data-testid="export-employees">
                  {exporting === "employees" ? "..." : "Employees + Payments"}
                </Button>
              </div>
              {/* Partnership */}
              <div className="p-4 bg-[#F7F2EB] space-y-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#2D2420] font-semibold">Partnership</p>
                <Button size="sm" onClick={exportPartnership} disabled={exporting === "partnership"}
                  className="bg-[#D19B5A] hover:bg-[#C08A4A] text-[#2D2420] text-[10px] uppercase tracking-wider h-8 rounded-none w-full" data-testid="export-partnership">
                  {exporting === "partnership" ? "..." : "Chandana & Akanksha"}
                </Button>
              </div>
              {/* Incoming */}
              <div className="p-4 bg-[#7E8B76]/10 space-y-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#7E8B76] font-semibold">Incoming Payments</p>
                <p className="text-[10px] text-[#8A7D76]">Customer payments with order ID, date, amount, mode</p>
                <Button size="sm" onClick={exportIncomingPayments} disabled={exporting === "incoming"}
                  className="bg-[#7E8B76] hover:bg-[#6E7B66] text-white text-[10px] uppercase tracking-wider h-8 rounded-none w-full" data-testid="export-incoming">
                  {exporting === "incoming" ? "..." : "Export Incoming"}
                </Button>
              </div>
              {/* Outgoing */}
              <div className="p-4 bg-[#C05C3B]/10 space-y-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#C05C3B] font-semibold">Outgoing Payments</p>
                <p className="text-[10px] text-[#8A7D76]">Employee payments + material purchases with reason, date, mode</p>
                <Button size="sm" onClick={exportOutgoingPayments} disabled={exporting === "outgoing"}
                  className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white text-[10px] uppercase tracking-wider h-8 rounded-none w-full" data-testid="export-outgoing">
                  {exporting === "outgoing" ? "..." : "Export Outgoing"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
