import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Trash2, Edit, Eye, Handshake, IndianRupee, Calendar } from "lucide-react";
import { toast } from "sonner";

const MODES = ["UPI", "Cash", "Card", "Bank Transfer"];

const Partnership = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chandana");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({ date: "", order: "NA", reason: "", paid_to: "", chandana: 0, akanksha: 0, sbi: 0, kshana: 0, cash: 0, mode: "UPI", comments: "", type: "expense" });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchEntries(); }, [activeTab]);

  const token = () => localStorage.getItem("token");
  const h = () => ({ Authorization: `Bearer ${token()}` });

  const fetchAll = async () => {
    try {
      const r = await axios.get(`${API}/reports/partnership`, { headers: h() });
      setReport(r.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  const fetchEntries = async () => {
    try {
      let partner = activeTab;
      let entryType = "";
      if (activeTab === "kshana_outgoing") {
        partner = "sbi";
        entryType = "expense";
      } else if (activeTab === "kshana_income") {
        partner = "kshana";
        entryType = "income";
      } else if (activeTab === "cash_income") {
        partner = "cash";
        entryType = "income";
      }
      let url = `${API}/partnership/entries?partner=${partner}`;
      if (entryType) url += `&entry_type=${entryType}`;
      const r = await axios.get(url, { headers: h() });
      setEntries(r.data);
    } catch { toast.error("Failed to load entries"); }
  };

  const openAdd = () => {
    const isIncome = activeTab === "kshana_income" || activeTab === "cash_income";
    const base = { date: "", order: "NA", reason: "", paid_to: "", chandana: 0, akanksha: 0, sbi: 0, kshana: 0, cash: 0, mode: "UPI", comments: "", type: isIncome ? "income" : "expense" };
    setForm(base);
    setEditEntry(null);
    setShowAddModal(true);
  };

  const openEdit = (entry) => {
    setForm({ date: entry.date, order: entry.order || "NA", reason: entry.reason, paid_to: entry.paid_to, chandana: entry.chandana || 0, akanksha: entry.akanksha || 0, sbi: entry.sbi || 0, kshana: entry.kshana || 0, cash: entry.cash || 0, mode: entry.mode || "UPI", comments: entry.comments || "", type: entry.type || "expense" });
    setEditEntry(entry);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.reason || !form.paid_to) { toast.error("Fill date, reason, and paid to"); return; }
    try {
      if (editEntry) {
        await axios.put(`${API}/partnership/entries/${editEntry.id}`, form, { headers: h() });
        toast.success("Updated");
      } else {
        await axios.post(`${API}/partnership/entries`, form, { headers: h() });
        toast.success("Added");
      }
      setShowAddModal(false);
      fetchEntries();
      fetchAll();
    } catch { toast.error("Failed to save"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/partnership/entries/${id}`, { headers: h() });
      toast.success("Deleted");
      fetchEntries();
      fetchAll();
    } catch { toast.error("Failed to delete"); }
  };

  const fmt = (a) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(a || 0);
  const fmtDate = (d) => { if (!d) return "-"; try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };
  const fmtMonth = (m) => { if (!m) return ""; try { const [y, mo] = m.split("-"); return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); } catch { return m; } };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div></div></AdminLayout>;

  const p = report;
  const amountField = activeTab === "chandana" ? "chandana" : activeTab === "akanksha" ? "akanksha" : activeTab === "kshana_income" ? "kshana" : activeTab === "cash_income" ? "cash" : "sbi";

  const TAB_CONFIG = {
    chandana: { label: "Chandana", title: "Chandana's Investments", btnText: "Add Record", color: "bg-[#C05C3B]" },
    akanksha: { label: "Akanksha", title: "Akanksha's Investments", btnText: "Add Record", color: "bg-[#D19B5A]" },
    kshana_outgoing: { label: "Kshana (Out)", title: "Kshana Outgoing Payments", btnText: "Add Outgoing", color: "bg-[#7A8B99]" },
    kshana_income: { label: "Kshana (UPI)", title: "Kshana UPI Income", btnText: "Add UPI Income", color: "bg-[#7E8B76]" },
    cash_income: { label: "Cash", title: "Cash Income", btnText: "Add Cash Income", color: "bg-[#B8854A]" },
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-partnership">
        <div className="flex items-center gap-3">
          <Handshake className="w-8 h-8 text-[#C05C3B]" />
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Partnership</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-[#C05C3B] to-[#A84C2F] text-white">
            <CardContent className="p-6 space-y-2">
              <p className="text-lg font-semibold">Chandana</p>
              <div className="flex justify-between text-sm"><span className="text-white/80">Invested</span><span className="font-semibold">{fmt(p?.chandana?.total_invested)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/80">Profit Share</span><span className="font-semibold">{fmt(p?.chandana?.profit_share)}</span></div>
              <div className="flex justify-between border-t border-white/20 pt-2"><span className="text-white/80">Total Gets</span><span className="text-xl font-bold">{fmt(p?.chandana?.total_gets)}</span></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#D19B5A] to-[#B8854A] text-white">
            <CardContent className="p-6 space-y-2">
              <p className="text-lg font-semibold">Akanksha</p>
              <div className="flex justify-between text-sm"><span className="text-white/80">Invested</span><span className="font-semibold">{fmt(p?.akanksha?.total_invested)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/80">Profit Share</span><span className="font-semibold">{fmt(p?.akanksha?.profit_share)}</span></div>
              <div className="flex justify-between border-t border-white/20 pt-2"><span className="text-white/80">Total Gets</span><span className="text-xl font-bold">{fmt(p?.akanksha?.total_gets)}</span></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#7A8B99] to-[#637382] text-white">
            <CardContent className="p-6 space-y-2">
              <p className="text-lg font-semibold">Kshana Account</p>
              <div className="flex justify-between text-sm"><span className="text-white/80">UPI Income</span><span className="font-semibold">{fmt(p?.kshana_account?.kshana_upi_income)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/80">Cash Income</span><span className="font-semibold">{fmt(p?.kshana_account?.cash_income)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/80">Outgoing (SBI)</span><span className="font-semibold">{fmt(p?.kshana_account?.total_sbi_outgoing)}</span></div>
              <div className="flex justify-between border-t border-white/20 pt-2"><span className="text-white/80">Balance</span><span className="text-xl font-bold">{fmt(p?.kshana_account?.balance)}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white border border-[#EFEBE4] rounded-xl"><p className="text-xs text-[#8A7D76]">Total Invested</p><p className="font-bold text-[#2D2420]">{fmt(p?.summary?.total_invested)}</p></div>
          <div className="text-center p-4 bg-white border border-[#EFEBE4] rounded-xl"><p className="text-xs text-[#8A7D76]">Income Received</p><p className="font-bold text-[#7E8B76]">{fmt(p?.summary?.total_income_received)}</p></div>
          <div className="text-center p-4 bg-white border border-[#EFEBE4] rounded-xl"><p className="text-xs text-[#8A7D76]">SBI Expenses</p><p className="font-bold text-[#7A8B99]">{fmt(p?.summary?.sbi_expenses)}</p></div>
          <div className={`text-center p-4 bg-white border rounded-xl ${(p?.summary?.remaining_after_returns || 0) >= 0 ? "border-[#7E8B76]" : "border-[#B85450]"}`}><p className="text-xs text-[#8A7D76]">Profit to Split</p><p className={`font-bold ${(p?.summary?.remaining_after_returns || 0) >= 0 ? "text-[#7E8B76]" : "text-[#B85450]"}`}>{fmt(p?.summary?.remaining_after_returns)}</p></div>
        </div>

        {/* Monthly Settlement Report */}
        {p?.monthly?.length > 0 && (
          <Card className="bg-white border-[#EFEBE4]">
            <CardHeader><CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Monthly Settlement Report</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-[#8A7D76] mb-4">Investments are settled first (proportionally), then remaining profit is split 50/50. Withdrawals from Kshana account are auto-tracked.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F2EB]">
                      <th className="py-2 px-2 text-left text-[#5C504A] text-xs">Month</th>
                      <th className="py-2 px-2 text-right text-[#C05C3B] text-xs">Chandana Inv.</th>
                      <th className="py-2 px-2 text-right text-[#D19B5A] text-xs">Akanksha Inv.</th>
                      <th className="py-2 px-2 text-right text-[#7E8B76] text-xs">Income</th>
                      <th className="py-2 px-2 text-right text-[#7A8B99] text-xs">SBI Out</th>
                      <th className="py-2 px-2 text-right text-[#2D2420] text-xs">Pool</th>
                      <th className="py-2 px-2 text-right text-[#C05C3B] text-xs">Chandana Gets</th>
                      <th className="py-2 px-2 text-right text-[#D19B5A] text-xs">Akanksha Gets</th>
                    </tr>
                  </thead>
                  <tbody>{p.monthly.map((m, i) => (
                    <tr key={i} className="border-b border-[#EFEBE4]">
                      <td className="py-2 px-2 font-medium text-[#2D2420]">{fmtMonth(m.month)}</td>
                      <td className="py-2 px-2 text-right text-[#C05C3B]">{m.chandana_invested > 0 ? fmt(m.chandana_invested) : "-"}</td>
                      <td className="py-2 px-2 text-right text-[#D19B5A]">{m.akanksha_invested > 0 ? fmt(m.akanksha_invested) : "-"}</td>
                      <td className="py-2 px-2 text-right text-[#7E8B76]">{m.income > 0 ? fmt(m.income) : "-"}</td>
                      <td className="py-2 px-2 text-right text-[#7A8B99]">{m.sbi_outgoing > 0 ? fmt(m.sbi_outgoing) : "-"}</td>
                      <td className={`py-2 px-2 text-right font-medium ${(m.pool || 0) >= 0 ? "text-[#7E8B76]" : "text-[#B85450]"}`}>{fmt(m.pool)}</td>
                      <td className="py-2 px-2 text-right font-medium text-[#C05C3B]">{fmt(m.chandana_settlement)}</td>
                      <td className="py-2 px-2 text-right font-medium text-[#D19B5A]">{fmt(m.akanksha_settlement)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-[#F7F2EB] font-bold">
                    <td className="py-2 px-2 text-[#2D2420]">Total</td>
                    <td className="py-2 px-2 text-right text-[#C05C3B]">{fmt(p?.chandana?.total_invested)}</td>
                    <td className="py-2 px-2 text-right text-[#D19B5A]">{fmt(p?.akanksha?.total_invested)}</td>
                    <td className="py-2 px-2 text-right text-[#7E8B76]">{fmt(p?.summary?.total_income_received)}</td>
                    <td className="py-2 px-2 text-right text-[#7A8B99]">{fmt(p?.summary?.sbi_expenses)}</td>
                    <td className={`py-2 px-2 text-right ${(p?.summary?.profit_pool || 0) >= 0 ? "text-[#7E8B76]" : "text-[#B85450]"}`}>{fmt(p?.summary?.profit_pool)}</td>
                    <td className="py-2 px-2 text-right text-[#C05C3B]">{fmt(p?.chandana?.total_gets)}</td>
                    <td className="py-2 px-2 text-right text-[#D19B5A]">{fmt(p?.akanksha?.total_gets)}</td>
                  </tr>
                  </tbody>
                </table>
              </div>

              {/* Withdrawals note */}
              {(p?.chandana?.withdrawals > 0 || p?.akanksha?.withdrawals > 0) && (
                <div className="mt-4 p-3 bg-[#F7F2EB] rounded-xl text-sm">
                  <p className="font-medium text-[#5C504A] mb-1">Withdrawals from Kshana Account:</p>
                  {p.chandana.withdrawals > 0 && <p className="text-[#C05C3B]">Chandana withdrew: {fmt(p.chandana.withdrawals)}</p>}
                  {p.akanksha.withdrawals > 0 && <p className="text-[#D19B5A]">Akanksha withdrew: {fmt(p.akanksha.withdrawals)}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for managing entries */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#F7F2EB] rounded-xl p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="chandana" className="rounded-lg data-[state=active]:bg-[#C05C3B] data-[state=active]:text-white">Chandana</TabsTrigger>
            <TabsTrigger value="akanksha" className="rounded-lg data-[state=active]:bg-[#D19B5A] data-[state=active]:text-white">Akanksha</TabsTrigger>
            <TabsTrigger value="kshana_outgoing" className="rounded-lg data-[state=active]:bg-[#7A8B99] data-[state=active]:text-white">Kshana (Out)</TabsTrigger>
            <TabsTrigger value="kshana_income" className="rounded-lg data-[state=active]:bg-[#7E8B76] data-[state=active]:text-white">Kshana (UPI)</TabsTrigger>
            <TabsTrigger value="cash_income" className="rounded-lg data-[state=active]:bg-[#B8854A] data-[state=active]:text-white">Cash</TabsTrigger>
          </TabsList>

          {Object.entries(TAB_CONFIG).map(([tab, cfg]) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card className="bg-white border-[#EFEBE4]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">{cfg.title}</CardTitle>
                  <Button onClick={openAdd} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-4" data-testid={`add-${tab}-entry`}>
                    <Plus className="w-4 h-4 mr-1" />{cfg.btnText}
                  </Button>
                </CardHeader>
                <CardContent>
                  {(tab === "kshana_income" || tab === "cash_income") && (
                    <div className="mb-4 p-3 bg-[#7E8B76]/10 rounded-xl text-sm text-[#5C504A]">
                      {tab === "kshana_income" ? "UPI customer payments flowing into the Kshana bank account." : "Cash payments received from customers."}
                    </div>
                  )}
                  {tab === "kshana_outgoing" && (
                    <div className="mb-4 p-3 bg-[#7E8B76]/10 rounded-xl text-sm text-[#5C504A]">
                      Outgoing payments from Kshana SBI account (worker salaries, materials, etc.)
                    </div>
                  )}
                  <div className="space-y-2">
                    {entries.length > 0 ? entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-[#F7F2EB] rounded-xl">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#2D2420] text-sm">{e.reason}</span>
                            {e.order && e.order !== "NA" && <span className="text-xs bg-white px-1.5 py-0.5 rounded text-[#C05C3B] cursor-pointer hover:bg-[#C05C3B]/10 transition-colors" onClick={(ev) => { ev.stopPropagation(); const oid = e.order.includes("&") ? e.order.split("&")[0].trim() : e.order; navigate(`/admin/orders/${oid}`); }}>#{e.order}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#8A7D76] mt-1 flex-wrap">
                            <span>{fmtDate(e.date)}</span>
                            <span>{(tab === "kshana_income" || tab === "cash_income") ? `From: ${e.paid_to}` : `To: ${e.paid_to}`}</span>
                            <span className="capitalize px-1.5 py-0.5 bg-white rounded">{e.mode}</span>
                            {e.comments && <span className="italic">{e.comments}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={`font-semibold text-sm whitespace-nowrap ${(tab === "kshana_income" || tab === "cash_income") ? "text-[#7E8B76]" : ""}`}>
                            {fmt(e[amountField])}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)} className="text-[#5C504A] hover:text-[#C05C3B] p-1"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="text-[#B85450] hover:text-[#B85450]/80 p-1"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    )) : <p className="text-center text-[#8A7D76] py-8">No entries yet</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-lg">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">{editEntry ? "Edit Entry" : "Add Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Order #</Label><Input value={form.order} onChange={(e) => setForm({...form, order: e.target.value})} className="bg-[#F7F2EB] border-transparent rounded-xl" placeholder="NA" /></div>
            </div>
            <div className="space-y-2"><Label>Reason/Item *</Label><Input value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} className="bg-[#F7F2EB] border-transparent rounded-xl" placeholder="e.g., Shop interior, Salary..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Paid To *</Label><Input value={form.paid_to} onChange={(e) => setForm({...form, paid_to: e.target.value})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Mode</Label>
                <select value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value})} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Chandana</Label><Input type="number" value={form.chandana} onChange={(e) => setForm({...form, chandana: parseFloat(e.target.value) || 0})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Akanksha</Label><Input type="number" value={form.akanksha} onChange={(e) => setForm({...form, akanksha: parseFloat(e.target.value) || 0})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>SBI (Out)</Label><Input type="number" value={form.sbi} onChange={(e) => setForm({...form, sbi: parseFloat(e.target.value) || 0})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Kshana (UPI In)</Label><Input type="number" value={form.kshana} onChange={(e) => setForm({...form, kshana: parseFloat(e.target.value) || 0})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Cash (In)</Label><Input type="number" value={form.cash} onChange={(e) => setForm({...form, cash: parseFloat(e.target.value) || 0})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Comments</Label><Input value={form.comments} onChange={(e) => setForm({...form, comments: e.target.value})} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">{editEntry ? "Update" : "Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Partnership;
