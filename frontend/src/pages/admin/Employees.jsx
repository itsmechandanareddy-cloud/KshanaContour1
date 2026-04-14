import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Plus, Phone, Mail, IndianRupee, Clock, Calendar, User, Edit, FileText, Upload, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer"];

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [newEmployee, setNewEmployee] = useState({
    name: "", phone: "", email: "", role: "", address: "",
    joining_date: "", salary: 0, documents: []
  });
  
  const [newPayment, setNewPayment] = useState({ amount: 0, date: "", mode: "cash", notes: "" });
  const [newHours, setNewHours] = useState({ date: "", hours: 0, notes: "" });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.phone || !newEmployee.role) {
      toast.error("Please fill required fields");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees`, newEmployee, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Employee added");
      setShowAddModal(false);
      setNewEmployee({ name: "", phone: "", email: "", role: "", address: "", joining_date: "", salary: 0, documents: [] });
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to add employee");
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.date) {
      toast.error("Please fill required fields");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees/${selectedEmployee.id}/payment`, newPayment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setNewPayment({ amount: 0, date: "", mode: "cash", notes: "" });
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const handleLogHours = async () => {
    if (!newHours.date || !newHours.hours) {
      toast.error("Please fill required fields");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/employees/${selectedEmployee.id}/hours`, newHours, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Hours logged");
      setShowHoursModal(false);
      setNewHours({ date: "", hours: 0, notes: "" });
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to log hours");
    }
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API}/employees/${selectedEmployee.id}/documents`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Document uploaded");
      fetchEmployees();
      // Refresh selected employee
      const resp = await axios.get(`${API}/employees/${selectedEmployee.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedEmployee(resp.data);
    } catch (error) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!selectedEmployee) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${selectedEmployee.id}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document deleted");
      fetchEmployees();
      const resp = await axios.get(`${API}/employees/${selectedEmployee.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedEmployee(resp.data);
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleViewDocument = (docId) => {
    const token = localStorage.getItem("token");
    window.open(`${API}/employees/${selectedEmployee.id}/documents/${docId}?token=${token}`, "_blank");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getTotalPaid = (payments) => {
    return (payments || []).reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalHours = (hours_log) => {
    return (hours_log || []).reduce((sum, h) => sum + h.hours, 0);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-employees">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">
            Employees
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6"
            data-testid="add-employee-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Employee Cards */}
        {employees.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-12 text-center">
              <p className="text-[#8A7D76]">No employees found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#C05C3B]/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-[#C05C3B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2D2420] text-lg">{employee.name}</h3>
                        <p className="text-sm text-[#8A7D76]">{employee.role}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#5C504A]">
                      <Phone className="w-4 h-4 text-[#8A7D76]" />
                      {employee.phone}
                    </div>
                    {employee.email && (
                      <div className="flex items-center gap-2 text-[#5C504A]">
                        <Mail className="w-4 h-4 text-[#8A7D76]" />
                        {employee.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#5C504A]">
                      <IndianRupee className="w-4 h-4 text-[#8A7D76]" />
                      Salary: {formatCurrency(employee.salary)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#EFEBE4]">
                    <div className="text-center p-3 bg-[#F7F2EB] rounded-xl">
                      <p className="text-sm text-[#8A7D76]">Total Paid</p>
                      <p className="font-semibold text-[#7E8B76]">{formatCurrency(getTotalPaid(employee.payments))}</p>
                    </div>
                    <div className="text-center p-3 bg-[#F7F2EB] rounded-xl">
                      <p className="text-sm text-[#8A7D76]">Hours Worked</p>
                      <p className="font-semibold text-[#2D2420]">{getTotalHours(employee.hours_log)} hrs</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedEmployee(employee); setShowPaymentModal(true); }}
                      className="flex-1 border-[#EFEBE4] rounded-lg"
                    >
                      <IndianRupee className="w-4 h-4 mr-1" />
                      Payment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedEmployee(employee); setShowHoursModal(true); }}
                      className="flex-1 border-[#EFEBE4] rounded-lg"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Hours
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedEmployee(employee); setShowDocsModal(true); }}
                      className="flex-1 border-[#EFEBE4] rounded-lg"
                      data-testid={`docs-btn-${employee.id}`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Docs {(employee.documents?.length > 0 && typeof employee.documents[0] === 'object') ? `(${employee.documents.length})` : ""}
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
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Add Employee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Name *</Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Phone *</Label>
                <Input
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Email</Label>
                <Input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Role *</Label>
                <Input
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                  placeholder="e.g., Tailor, Helper"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Joining Date</Label>
                <Input
                  type="date"
                  value={newEmployee.joining_date}
                  onChange={(e) => setNewEmployee({ ...newEmployee, joining_date: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Salary</Label>
                <Input
                  type="number"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: parseFloat(e.target.value) || 0 })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Address</Label>
              <Input
                value={newEmployee.address}
                onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Record Payment - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Amount *</Label>
              <Input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Date *</Label>
              <Input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Mode</Label>
              <Select value={newPayment.mode} onValueChange={(value) => setNewPayment({ ...newPayment, mode: value })}>
                <SelectTrigger className="bg-[#F7F2EB] border-transparent rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Notes</Label>
              <Input
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleAddPayment} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hours Modal */}
      <Dialog open={showHoursModal} onOpenChange={setShowHoursModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Log Hours - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Date *</Label>
              <Input
                type="date"
                value={newHours.date}
                onChange={(e) => setNewHours({ ...newHours, date: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Hours *</Label>
              <Input
                type="number"
                step="0.5"
                value={newHours.hours}
                onChange={(e) => setNewHours({ ...newHours, hours: parseFloat(e.target.value) || 0 })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Notes</Label>
              <Input
                value={newHours.notes}
                onChange={(e) => setNewHours({ ...newHours, notes: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoursModal(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleLogHours} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">
              Log Hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents Modal */}
      <Dialog open={showDocsModal} onOpenChange={setShowDocsModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Documents - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload */}
            <div className="flex items-center gap-3">
              <label
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#C05C3B]/30 rounded-xl cursor-pointer hover:bg-[#C05C3B]/5 transition-colors"
                data-testid="doc-upload-label"
              >
                <Upload className="w-5 h-5 text-[#C05C3B]" />
                <span className="text-sm text-[#5C504A]">
                  {uploading ? "Uploading..." : "Click to upload document"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUploadDocument}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                  data-testid="doc-upload-input"
                />
              </label>
            </div>

            {/* Document List */}
            {selectedEmployee?.documents?.filter(d => typeof d === 'object').length > 0 ? (
              <div className="space-y-2">
                {selectedEmployee.documents.filter(d => typeof d === 'object').map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#F7F2EB] rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-[#C05C3B] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2D2420] truncate">{doc.original_filename}</p>
                        <p className="text-xs text-[#8A7D76]">
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ""}
                          {doc.size ? ` · ${(doc.size / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc.id)}
                        className="text-[#5C504A] hover:text-[#C05C3B]"
                        data-testid={`view-doc-${doc.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-[#B85450] hover:text-[#B85450]/80"
                        data-testid={`delete-doc-${doc.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-[#8A7D76] py-4">No documents uploaded yet</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocsModal(false)} className="rounded-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Employees;
