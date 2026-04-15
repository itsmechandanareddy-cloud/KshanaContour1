import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Search, User, Phone, Mail, KeyRound, Trash2, Edit, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState(null);
  const [editData, setEditData] = useState({ name: "", phone: "", email: "", gender: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    if (!search) { setFiltered(customers); return; }
    const s = search.toLowerCase();
    setFiltered(customers.filter(c => c.name?.toLowerCase().includes(s) || c.phone?.includes(search) || c.email?.toLowerCase().includes(s)));
  }, [search, customers]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/customers`, { headers: { Authorization: `Bearer ${token}` } });
      setCustomers(res.data);
    } catch { toast.error("Failed to load customers"); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (customer) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${API}/customers/${customer.id}/reset-password`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
    } catch { toast.error("Failed to reset password"); }
  };

  const handleUpdateCustomer = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/customers/${editCustomer.id}`, editData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Customer updated");
      setEditCustomer(null);
      fetchCustomers();
    } catch { toast.error("Failed to update"); }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Customer deleted");
      setDeleteConfirm(null);
      fetchCustomers();
    } catch { toast.error("Failed to delete"); }
  };

  const openEdit = (c) => {
    setEditData({ name: c.name || "", phone: c.phone || "", email: c.email || "", gender: c.gender || "" });
    setEditCustomer(c);
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-customers">
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Customers</h1>
          <span className="text-sm text-[#8A7D76]">{customers.length} total</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2420]/30" />
          <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 focus:border-[#2D2420] focus:ring-0" data-testid="search-customers" />
        </div>

        <p className="text-xs text-[#8A7D76]">Customer login: <strong>Name</strong> + <strong>Password</strong> (default password is their phone number)</p>

        {/* Customer List */}
        {filtered.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]"><CardContent className="p-12 text-center"><p className="text-[#8A7D76]">No customers found</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 bg-white border border-[#EFEBE4] hover:border-[#D19B5A]/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#C05C3B]/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#C05C3B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#2D2420]">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A7D76] mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.gender && <span className="capitalize">{c.gender}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleResetPassword(c)}
                    className="text-[#D19B5A] hover:bg-[#D19B5A]/10" title="Reset password to phone number" data-testid={`reset-pwd-${c.id}`}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="text-[#5C504A] hover:text-[#C05C3B]">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(c)} className="text-[#B85450] hover:bg-[#B85450]/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="bg-[#FDFBF7] border-[#2D2420]/10 max-w-lg rounded-none">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-2xl text-[#2D2420] font-light">Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Name</Label>
                <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 px-0 focus:border-[#2D2420] focus:ring-0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Phone</Label>
                <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 px-0 focus:border-[#2D2420] focus:ring-0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Email</Label>
                <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 px-0 focus:border-[#2D2420] focus:ring-0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Gender</Label>
                <select value={editData.gender} onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                  className="h-10 w-full border-b border-[#2D2420]/15 bg-transparent text-sm focus:outline-none focus:border-[#2D2420]">
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)} className="rounded-none border-[#2D2420]/15 text-xs uppercase tracking-[0.1em]">Cancel</Button>
            <Button onClick={handleUpdateCustomer} className="bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none text-xs uppercase tracking-[0.1em]">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-sm">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#B85450]">Delete Customer</DialogTitle></DialogHeader>
          <p className="text-sm text-[#5C504A] py-2">Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-full flex-1">Cancel</Button>
            <Button onClick={() => handleDeleteCustomer(deleteConfirm?.id)} className="bg-[#B85450] hover:bg-[#9A4440] text-white rounded-full flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Customers;
