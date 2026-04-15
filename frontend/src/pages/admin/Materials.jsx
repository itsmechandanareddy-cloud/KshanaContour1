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
import { Plus, Package, Calendar, IndianRupee, User, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer"];
const UNITS = ["meters", "yards", "pieces", "kg", "grams", "rolls"];

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState(null);
  
  const [newMaterial, setNewMaterial] = useState({
    name: "", description: "", quantity: 0, unit: "meters",
    cost: 0, purchase_date: "", payment_mode: "cash", supplier: ""
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (error) {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name || !newMaterial.quantity || !newMaterial.purchase_date) {
      toast.error("Please fill required fields");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      if (editMaterial) {
        await axios.put(`${API}/materials/${editMaterial.id}`, newMaterial, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Material updated");
      } else {
        await axios.post(`${API}/materials`, newMaterial, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Material added");
      }
      setShowAddModal(false);
      setEditMaterial(null);
      setNewMaterial({
        name: "", description: "", quantity: 0, unit: "meters",
        cost: 0, purchase_date: "", payment_mode: "cash", supplier: ""
      });
      fetchMaterials();
    } catch (error) {
      toast.error("Failed to save material");
    }
  };

  const handleEditMaterial = (mat) => {
    setNewMaterial({
      name: mat.name || "", description: mat.description || "",
      quantity: mat.quantity || 0, unit: mat.unit || "meters",
      cost: mat.cost || 0, purchase_date: mat.purchase_date || "",
      payment_mode: mat.payment_mode || "cash", supplier: mat.supplier || ""
    });
    setEditMaterial(mat);
    setShowAddModal(true);
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Material deleted");
      fetchMaterials();
    } catch { toast.error("Failed to delete"); }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
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
      <div className="space-y-6 animate-fade-in" data-testid="admin-materials">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">
            Raw Materials
          </h1>
          <Button
            onClick={() => { setEditMaterial(null); setNewMaterial({ name: "", description: "", quantity: 0, unit: "meters", cost: 0, purchase_date: "", payment_mode: "cash", supplier: "" }); setShowAddModal(true); }}
            className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6"
            data-testid="add-material-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>

        {/* Materials Table */}
        {materials.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-12 text-center">
              <p className="text-[#8A7D76]">No materials found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left py-4 px-6">Material</th>
                      <th className="text-left py-4 px-6">Quantity</th>
                      <th className="text-left py-4 px-6">Cost</th>
                      <th className="text-left py-4 px-6">Purchase Date</th>
                      <th className="text-left py-4 px-6">Payment</th>
                      <th className="text-left py-4 px-6">Supplier</th>
                      <th className="text-left py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.id} className="table-row">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-[#2D2420]">{material.name}</p>
                            {material.description && (
                              <p className="text-sm text-[#8A7D76]">{material.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[#5C504A]">
                          {material.quantity} {material.unit}
                        </td>
                        <td className="py-4 px-6 text-[#5C504A]">
                          {formatCurrency(material.cost)}
                        </td>
                        <td className="py-4 px-6 text-[#5C504A]">
                          {formatDate(material.purchase_date)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F7F2EB] text-[#5C504A]">
                            {material.payment_mode?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#5C504A]">
                          {material.supplier || "-"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditMaterial(material)} className="text-[#5C504A] hover:text-[#C05C3B] p-1"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(material.id)} className="text-[#B85450] p-1"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#C05C3B]/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-[#C05C3B]" />
              </div>
              <div>
                <p className="text-sm text-[#8A7D76]">Total Items</p>
                <p className="text-2xl font-semibold text-[#2D2420]">{materials.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D19B5A]/10 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-[#D19B5A]" />
              </div>
              <div>
                <p className="text-sm text-[#8A7D76]">Total Spent</p>
                <p className="text-2xl font-semibold text-[#2D2420]">
                  {formatCurrency(materials.reduce((sum, m) => sum + (m.cost || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#7A8B99]/10 flex items-center justify-center">
                <User className="w-6 h-6 text-[#7A8B99]" />
              </div>
              <div>
                <p className="text-sm text-[#8A7D76]">Suppliers</p>
                <p className="text-2xl font-semibold text-[#2D2420]">
                  {new Set(materials.map(m => m.supplier).filter(Boolean)).size}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Material Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              {editMaterial ? "Edit Material" : "Add Material"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Name *</Label>
              <Input
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
                placeholder="e.g., Silk Fabric"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Description</Label>
              <Input
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                className="bg-[#F7F2EB] border-transparent rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Quantity *</Label>
                <Input
                  type="number"
                  value={newMaterial.quantity}
                  onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseFloat(e.target.value) || 0 })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Unit</Label>
                <select value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                  {UNITS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Cost (₹)</Label>
                <Input
                  type="number"
                  value={newMaterial.cost}
                  onChange={(e) => setNewMaterial({ ...newMaterial, cost: parseFloat(e.target.value) || 0 })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Purchase Date *</Label>
                <Input
                  type="date"
                  value={newMaterial.purchase_date}
                  onChange={(e) => setNewMaterial({ ...newMaterial, purchase_date: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Payment Mode</Label>
                <select value={newMaterial.payment_mode} onChange={(e) => setNewMaterial({ ...newMaterial, payment_mode: e.target.value })} className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none">
                  {PAYMENT_MODES.map((mode) => (<option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Supplier</Label>
                <Input
                  value={newMaterial.supplier}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
                  className="bg-[#F7F2EB] border-transparent rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleAddMaterial} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">
              {editMaterial ? "Update" : "Add Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Materials;
AdminLayout>
  );
};

export default Materials;
