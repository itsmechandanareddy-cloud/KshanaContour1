import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Plus, Phone, Mail, IndianRupee, Clock, User, FileText, Upload, Trash2, Eye, Briefcase, X } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer"];
const EMPLOYEE_ROLES = ["master", "tailor", "worker"];

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null); // { emp, type: 'hours' | 'payments' }
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    name: "", phone: "", email: "", role: "tailor", pay_type: "weekly", address: "", joining_date: "", salary: 0, documents: []
  });
  const [newPayment, setNewPayment] = useState({ amount: 0, date: "", mode: "cash", notes: "" });
  const [newHours, setNewHours] = useState({ date: "", hours: 0, order_id: "", item_index: 0, notes: "" });
  const [newWork, setNewWork] = useState({ order_id: "", item_index: 0, date: "", hours: 0, notes: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };
      const [empRes, ordRes] = await Promise.all([
        axios.get(`${API}/employees`, { headers: h }),
        axios.get(`${API}/orders`, { headers: h })
      ]);
      setEmployees(empRes.data);
      setOrders(ordRes.data.filter(o => o.status !== "delivered"));
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.phone || !newEmployee.role) { toast.error("Fill required fields"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees`, newEmployee, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Employee added");
      setShowAddModal(false);
      setNewEmployee({ name: "", phone: "", email: "", role: "tailor", pay_type: "weekly", address: "", joining_date: "", salary: 0, documents: [] });
      fetchData();
    } catch { toast.error("Failed to add employee"); }
  };

  const handleDeleteEmployee = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Employee deleted");
      setShowDeleteConfirm(null);
      fetchData();
    } catch { toast.error("Failed to delete"); }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.date) { toast.error("Fill required fields"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees/${selectedEmployee.id}/payment`, newPayment, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setNewPayment({ amount: 0, date: "", mode: "cash", notes: "" });
      fetchData();
    } catch { toast.error("Failed to record payment"); }
  };

  const handleLogHours = async () => {
    if (!newHours.date || !newHours.hours) { toast.error("Fill required fields"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees/${selectedEmployee.id}/hours`, newHours, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Hours logged");
      setShowHoursModal(false);
      setNewHours({ date: "", hours: 0, order_id: "", item_index: 0, notes: "" });
      fetchData();
    } catch { toast.error("Failed to log hours"); }
  };

  const handleAssignWork = async () => {
    if (!newWork.order_id || !newWork.date || !newWork.hours) { toast.error("Fill required fields"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees/${selectedEmployee.id}/work`, {
        employee_id: selectedEmployee.id, ...newWork
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Work assigned");
      setShowWorkModal(false);
      setNewWork({ order_id: "", item_index: 0, date: "", hours: 0, notes: "" });
      fetchData();
    } catch { toast.error("Failed to assign work"); }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      await axios.post(`${API}/employees/${selectedEmployee.id}/documents`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Document uploaded");
      fetchData();
      const r = await axios.get(`${API}/employees/${selectedEmployee.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedEmployee(r.data);
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${selectedEmployee.id}/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Deleted");
      fetchData();
      const r = await axios.get(`${API}/employees/${selectedEmployee.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedEmployee(r.data);
    } catch { toast.error("Failed"); }
  };

  const fmt = (a) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(a || 0);
  const getTotalPaid = (p) => (p || []).reduce((s, x) => s + x.amount, 0);
  const getTotalHours = (h) => (h || []).reduce((s, x) => s + x.hours, 0);
  const roleLabel = (r) => ({ master: "Master", tailor: "Tailor", worker: "Worker" }[r] || r);
  const roleBg = (r) => ({ master: "bg-[#D19B5A]/10 text-[#D19B5A]", tailor: "bg-[#C05C3B]/10 text-[#C05C3B]", worker: "bg-[#7A8B99]/10 text-[#7A8B99]" }[r] || "bg-[#F7F2EB] text-[#5C504A]");

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-employees">
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Employees</h1>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6" data-testid="add-employee-button">
            <Plus className="w-4 h-4 mr-2" />Add Employee
          </Button>
        </div>

        {employees.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]"><CardContent className="p-12 text-center"><p className="text-[#8A7D76]">No employees found</p></CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {employees.map((emp) => (
              <Card key={emp.id} className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#C05C3B]/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-[#C05C3B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2D2420] text-lg">{emp.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBg(emp.role)}`}>{roleLabel(emp.role)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(emp)} className="text-[#B85450] hover:bg-[#B85450]/10" data-testid={`delete-emp-${emp.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-[#5C504A]"><Phone className="w-4 h-4 text-[#8A7D76]" />{emp.phone}</div>
                    {emp.email && <div className="flex items-center gap-2 text-[#5C504A]"><Mail className="w-4 h-4 text-[#8A7D76]" />{emp.email}</div>}
                    <div className="flex items-center gap-2 text-[#5C504A]"><IndianRupee className="w-4 h-4 text-[#8A7D76]" />Rate: {fmt(emp.salary)} {emp.pay_type === "hourly" ? "/hour" : "/week"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#EFEBE4]">
                    <div className="text-center p-3 bg-[#F7F2EB] rounded-xl cursor-pointer hover:bg-[#EFEBE4] transition-colors" onClick={() => setShowDetailModal({ emp, type: "payments" })}>
                      <p className="text-sm text-[#8A7D76]">Total Paid</p>
                      <p className="font-semibold text-[#7E8B76]">{fmt(getTotalPaid(emp.payments))}</p>
                      <p className="text-[10px] text-[#C05C3B] mt-1">View Details</p>
                    </div>
                    <div className="text-center p-3 bg-[#F7F2EB] rounded-xl cursor-pointer hover:bg-[#EFEBE4] transition-colors" onClick={() => setShowDetailModal({ emp, type: "hours" })}>
                      <p className="text-sm text-[#8A7D76]">{emp.pay_type === "hourly" ? "Hours Worked" : "Payment History"}</p>
                      <p className="font-semibold text-[#2D2420]">{emp.pay_type === "hourly" ? `${getTotalHours(emp.hours_log)} hrs` : `${(emp.payments || []).length} payments`}</p>
                      <p className="text-[10px] text-[#C05C3B] mt-1">View Details</p>
                    </div>
                  </div>

                  {/* Work Assignments Preview */}
                  {emp.work_assignments?.length > 0 && (
                    <div className="pt-3 border-t border-[#EFEBE4]">
                      <p className="text-xs font-semibold text-[#8A7D76] mb-2">Recent Work</p>
                      <div className="space-y-1">
                        {emp.work_assignments.slice(-3).reverse().map((w, i) => (
                          <div key={i} className="flex justify-between text-xs bg-[#F7F2EB] rounded-lg p-2">
                            <span className="text-[#2D2420]">#{w.order_id} {w.notes ? `- ${w.notes}` : ""}</span>
                            <span className="text-[#8A7D76]">{w.hours}h · {w.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setShowPaymentModal(true); }} className="border-[#EFEBE4] rounded-lg">
                      <IndianRupee className="w-4 h-4 mr-1" />Pay
                    </Button>
                    {(emp.pay_type === "hourly" || emp.role === "worker") && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setShowHoursModal(true); }} className="border-[#EFEBE4] rounded-lg">
                        <Clock className="w-4 h-4 mr-1" />Hours
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setShowWorkModal(true); }} className="border-[#EFEBE4] rounded-lg">
                      <Briefcase className="w-4 h-4 mr-1" />Assign
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setShowDocsModal(true); }} className="border-[#EFEBE4] rounded-lg" data-testid={`docs-btn-${emp.id}`}>
                      <FileText className="w-4 h-4 mr-1" />Docs{emp.documents?.filter(d => typeof d === 'object').length > 0 ? ` (${emp.documents.filter(d => typeof d === 'object').length})` : ""}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-lg">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Name *</Label>
                <Input value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Phone *</Label>
                <Input value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Type *</Label>
                <select value={newEmployee.role} onChange={(e) => {
                  const role = e.target.value;
                  const defaultPay = role === "worker" ? "hourly" : "weekly";
                  setNewEmployee({ ...newEmployee, role, pay_type: defaultPay });
                }} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20">
                  <option value="master">Master</option>
                  <option value="tailor">Tailor</option>
                  <option value="worker">Worker</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Pay Type</Label>
                <select value={newEmployee.pay_type} onChange={(e) => setNewEmployee({ ...newEmployee, pay_type: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20">
                  <option value="weekly">Weekly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Rate ({newEmployee.pay_type === "hourly" ? "/hour" : "/week"})</Label>
                <Input type="number" value={newEmployee.salary} onChange={(e) => setNewEmployee({ ...newEmployee, salary: parseFloat(e.target.value) || 0 })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Email</Label>
                <Input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Joining Date</Label>
                <Input type="date" value={newEmployee.joining_date} onChange={(e) => setNewEmployee({ ...newEmployee, joining_date: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Address</Label>
              <Input value={newEmployee.address} onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleAddEmployee} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Record Payment - {selectedEmployee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            <div className="space-y-2"><Label>Mode</Label>
              <select value={newPayment.mode} onChange={(e) => setNewPayment({ ...newPayment, mode: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={newPayment.notes} onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleAddPayment} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hours Modal */}
      <Dialog open={showHoursModal} onOpenChange={setShowHoursModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Log Hours - {selectedEmployee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={newHours.date} onChange={(e) => setNewHours({ ...newHours, date: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            <div className="space-y-2"><Label>Hours *</Label><Input type="number" step="0.5" value={newHours.hours} onChange={(e) => setNewHours({ ...newHours, hours: parseFloat(e.target.value) || 0 })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            <div className="space-y-2"><Label>Order (optional)</Label>
              <select value={newHours.order_id || ""} onChange={(e) => setNewHours({ ...newHours, order_id: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                <option value="">Select order</option>
                <option value="general">General Work</option>
                {orders.map(o => <option key={o.order_id} value={o.order_id}>#{o.order_id} - {o.customer_name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={newHours.notes} onChange={(e) => setNewHours({ ...newHours, notes: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoursModal(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleLogHours} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">Log Hours</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Work Modal */}
      <Dialog open={showWorkModal} onOpenChange={setShowWorkModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Assign Work - {selectedEmployee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Order *</Label>
              <select value={newWork.order_id || ""} onChange={(e) => setNewWork({ ...newWork, order_id: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                <option value="">Select order</option>
                {orders.map(o => <option key={o.order_id} value={o.order_id}>#{o.order_id} - {o.customer_name}</option>)}
              </select>
            </div>
            {newWork.order_id && (
              <div className="space-y-2"><Label>Item</Label>
                <select value={String(newWork.item_index)} onChange={(e) => setNewWork({ ...newWork, item_index: parseInt(e.target.value) })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                  {(orders.find(o => o.order_id === newWork.order_id)?.items || []).map((item, i) => (
                    <option key={i} value={String(i)}>Item {i + 1}: {item.service_type}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={newWork.date} onChange={(e) => setNewWork({ ...newWork, date: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
              <div className="space-y-2"><Label>Hours *</Label><Input type="number" step="0.5" value={newWork.hours} onChange={(e) => setNewWork({ ...newWork, hours: parseFloat(e.target.value) || 0 })} className="bg-[#F7F2EB] border-transparent rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={newWork.notes} onChange={(e) => setNewWork({ ...newWork, notes: e.target.value })} className="bg-[#F7F2EB] border-transparent rounded-xl" placeholder="e.g., Stitching, Embroidery..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkModal(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleAssignWork} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">Assign Work</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents Modal */}
      <Dialog open={showDocsModal} onOpenChange={setShowDocsModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-lg">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Documents - {selectedEmployee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#C05C3B]/30 rounded-xl cursor-pointer hover:bg-[#C05C3B]/5">
              <Upload className="w-5 h-5 text-[#C05C3B]" />
              <span className="text-sm text-[#5C504A]">{uploading ? "Uploading..." : "Click to upload"}</span>
              <input type="file" className="hidden" onChange={handleUploadDocument} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp" />
            </label>
            {selectedEmployee?.documents?.filter(d => typeof d === 'object').length > 0 ? (
              <div className="space-y-2">
                {selectedEmployee.documents.filter(d => typeof d === 'object').map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#F7F2EB] rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-[#C05C3B] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2D2420] truncate">{doc.original_filename}</p>
                        <p className="text-xs text-[#8A7D76]">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-[#B85450]"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-sm text-[#8A7D76] py-4">No documents uploaded</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDocsModal(false)} className="rounded-full">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader><DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#B85450]">Delete Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-[#5C504A] py-4">Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="rounded-full">Cancel</Button>
            <Button onClick={() => handleDeleteEmployee(showDeleteConfirm?.id)} className="bg-[#B85450] hover:bg-[#9A4440] text-white rounded-full" data-testid="confirm-delete-emp">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Modal */}
      <Dialog open={!!showDetailModal} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-2xl max-h-[80vh] overflow-y-auto">
          {showDetailModal && (
            <>
              <DialogHeader>
                <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
                  {showDetailModal.emp.name} — {showDetailModal.type === "payments" ? "Payment Details" : (showDetailModal.emp.pay_type === "hourly" ? "Work & Hours Details" : "Payment History")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-[#F7F2EB] rounded-xl">
                    <p className="text-xs text-[#8A7D76]">Role</p>
                    <p className="font-semibold text-[#2D2420] capitalize">{showDetailModal.emp.role}</p>
                  </div>
                  <div className="text-center p-3 bg-[#F7F2EB] rounded-xl">
                    <p className="text-xs text-[#8A7D76]">Pay Type</p>
                    <p className="font-semibold text-[#2D2420] capitalize">{showDetailModal.emp.pay_type || "weekly"}</p>
                  </div>
                  <div className="text-center p-3 bg-[#F7F2EB] rounded-xl">
                    <p className="text-xs text-[#8A7D76]">Rate</p>
                    <p className="font-semibold text-[#2D2420]">{fmt(showDetailModal.emp.salary)} {showDetailModal.emp.pay_type === "hourly" ? "/hr" : "/wk"}</p>
                  </div>
                </div>

                {/* Worker: Hours & Work Details */}
                {showDetailModal.type === "hours" && showDetailModal.emp.pay_type === "hourly" && (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-[#5C504A]">Hours Worked — {getTotalHours(showDetailModal.emp.hours_log)} total hrs</h3>
                      <span className="text-sm font-semibold text-[#7E8B76]">Earned: {fmt(getTotalHours(showDetailModal.emp.hours_log) * (showDetailModal.emp.salary || 0))}</span>
                    </div>
                    {showDetailModal.emp.hours_log?.length > 0 ? (
                      <div className="space-y-2">
                        {[...showDetailModal.emp.hours_log].reverse().map((h, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl border border-[#EFEBE4]">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[#2D2420] text-sm">{h.date}</span>
                                  <span className="text-xs bg-[#C05C3B]/10 text-[#C05C3B] px-2 py-0.5 rounded">{h.hours} hrs</span>
                                </div>
                                {h.order_id && h.order_id !== "general" && (
                                  <p className="text-xs text-[#8A7D76] mt-1">Order: #{h.order_id}{h.item_index !== undefined && h.item_index !== null ? ` · Item ${h.item_index + 1}` : ""}</p>
                                )}
                                {h.notes && <p className="text-xs text-[#8A7D76] mt-1 italic">{h.notes}</p>}
                              </div>
                              <span className="font-semibold text-[#7E8B76] text-sm">{fmt(h.hours * (showDetailModal.emp.salary || 0))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center text-[#8A7D76] py-4">No hours logged</p>}

                    {/* Work Assignments */}
                    {showDetailModal.emp.work_assignments?.length > 0 && (
                      <>
                        <h3 className="text-sm font-bold text-[#5C504A] pt-2">Work Assignments</h3>
                        <div className="space-y-2">
                          {[...showDetailModal.emp.work_assignments].reverse().map((w, i) => (
                            <div key={i} className="flex justify-between p-3 bg-white rounded-xl border border-[#EFEBE4] text-sm">
                              <div>
                                <span className="font-medium text-[#2D2420]">Order #{w.order_id}</span>
                                {w.item_index !== undefined && <span className="text-xs text-[#8A7D76] ml-2">Item {w.item_index + 1}</span>}
                                <div className="text-xs text-[#8A7D76] mt-1">{w.date} · {w.hours} hrs{w.notes ? ` · ${w.notes}` : ""}</div>
                              </div>
                              <span className="font-semibold text-[#7E8B76]">{fmt(w.hours * (showDetailModal.emp.salary || 0))}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Master/Tailor: Payment History (weekly) */}
                {(showDetailModal.type === "hours" && showDetailModal.emp.pay_type !== "hourly") && (
                  <>
                    <h3 className="text-sm font-bold text-[#5C504A]">Weekly Payment History — {fmt(getTotalPaid(showDetailModal.emp.payments))} total</h3>
                    {showDetailModal.emp.payments?.length > 0 ? (
                      <div className="space-y-2">
                        {[...showDetailModal.emp.payments].reverse().map((p, i) => (
                          <div key={i} className="flex justify-between p-3 bg-white rounded-xl border border-[#EFEBE4]">
                            <div>
                              <span className="font-medium text-[#2D2420] text-sm">{p.date}</span>
                              <div className="text-xs text-[#8A7D76] mt-1">
                                <span className="capitalize px-1.5 py-0.5 bg-[#F7F2EB] rounded">{p.mode?.replace("_", " ")}</span>
                                {p.notes && <span className="ml-2 italic">{p.notes}</span>}
                              </div>
                            </div>
                            <span className="font-semibold text-[#7E8B76] text-sm">{fmt(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center text-[#8A7D76] py-4">No payments recorded</p>}
                  </>
                )}

                {/* Payments View (Total Paid click) */}
                {showDetailModal.type === "payments" && (
                  <>
                    <h3 className="text-sm font-bold text-[#5C504A]">All Payments — {fmt(getTotalPaid(showDetailModal.emp.payments))} total</h3>
                    {showDetailModal.emp.payments?.length > 0 ? (
                      <div className="space-y-2">
                        {[...showDetailModal.emp.payments].reverse().map((p, i) => (
                          <div key={i} className="flex justify-between p-3 bg-white rounded-xl border border-[#EFEBE4]">
                            <div>
                              <span className="font-medium text-[#2D2420] text-sm">{p.date}</span>
                              <div className="text-xs text-[#8A7D76] mt-1">
                                <span className="capitalize px-1.5 py-0.5 bg-[#F7F2EB] rounded">{p.mode?.replace("_", " ")}</span>
                                {p.notes && <span className="ml-2 italic">{p.notes}</span>}
                              </div>
                            </div>
                            <span className="font-semibold text-[#7E8B76] text-sm">{fmt(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center text-[#8A7D76] py-4">No payments recorded</p>}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Employees;
