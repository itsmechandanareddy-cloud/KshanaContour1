import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, IndianRupee, Save, Printer, Upload, X, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = [
  "Bridal blouses",
  "Normal blouses",
  "Traditional blouses",
  "Contemporary blouses",
  "Hand work",
  "Machine work",
  "Saree lace",
  "Saree kuchu",
  "Saree fall",
  "Any form of tailoring",
  "Men's wear",
  "Kids traditional wear",
  "Kids modern wear",
  "Length alterations",
  "Frocks",
  "Kurtha pajamas",
  "Custom stitching and alterations"
];

const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer"];

const defaultItem = {
  service_type: "",
  blouse_type: "without_cups",
  padded: "no",
  princess_cut: "no",
  open_style: "back",
  front_neck_design: "",
  back_neck_design: "",
  additional_notes: "",
  cost: ""
};

const defaultMeasurements = {
  // Blouse
  blouse_length: "", blouse_shoulder: "", blouse_cross_back: "", blouse_back_deep_balance: "",
  blouse_upper_chest: "", blouse_chest: "", blouse_waist: "", blouse_arm_round: "",
  blouse_bicep: "", blouse_sleeve_length: "", blouse_sleeve_round: "", blouse_point: "",
  blouse_bust_length: "", blouse_front_shoulder: "", blouse_cross_front: "", blouse_front_deep: "",
  blouse_front_neck: "", blouse_back_neck: "",
  // Lehenga
  lehenga_length: "", lehenga_waist: "", lehenga_hip: "",
  // Kurta Top
  kurta_length: "", kurta_shoulder: "", kurta_cross_back: "", kurta_back_deep: "",
  kurta_front_deep: "", kurta_upper_chest: "", kurta_waist: "", kurta_waist_length: "",
  kurta_slit_open_length: "", kurta_hip_round: "", kurta_sleeve_length: "", kurta_sleeve_round: "",
  kurta_bicep: "", kurta_cross_front: "", kurta_front_shoulder: "",
  kurta_front_neck: "", kurta_back_neck: "",
  // Pant
  pant_length: "", pant_waist: "", pant_hip_round: "", pant_high_round: "",
  pant_knee_round: "", pant_bottom: "", pant_new_length: "",
  // Legacy (keep for backward compat)
  length: "", shoulder: "", sleeve_length: "", arm_round: "", bicep: "", upper_chest: "",
  chest: "", waist: "", point: "", bust_length: "", front_length: "", cross_front: "",
  back_deep_balance: "", cross_back: "", sleeve_round: "", front_neck: "", back_neck: "",
  additional_notes: ""
};

const OrderForm = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const isEdit = !!orderId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_age: "",
    customer_gender: "",
    delivery_date: "",
    description: "",
    tax_percentage: 18,
    advance_amount: 0,
    advance_date: new Date().toISOString().split('T')[0],
    advance_mode: "cash"
  });
  
  const [items, setItems] = useState([{ ...defaultItem }]);
  const [measurements, setMeasurements] = useState({ ...defaultMeasurements });
  const [activeMeasurementTypes, setActiveMeasurementTypes] = useState([]);
  const [selectedMeasurementType, setSelectedMeasurementType] = useState("");
  const [existingOrder, setExistingOrder] = useState(null);
  const [newPayment, setNewPayment] = useState({ amount: "", date: "", mode: "cash", notes: "" });
  const [orderImages, setOrderImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const order = response.data;
      setExistingOrder(order);
      setFormData({
        customer_name: order.customer_name || "",
        customer_phone: order.customer_phone || "",
        customer_email: order.customer_email || "",
        customer_age: order.customer_age || "",
        customer_gender: order.customer_gender || "",
        delivery_date: order.delivery_date?.split('T')[0] || "",
        description: order.description || "",
        tax_percentage: order.tax_percentage || 18,
        advance_amount: 0,
        advance_date: new Date().toISOString().split('T')[0],
        advance_mode: "cash"
      });
      setItems(order.items?.length > 0 ? order.items : [{ ...defaultItem }]);
      const m = order.measurements || defaultMeasurements;
      setMeasurements(m);
      // Detect which measurement types have data
      const types = [];
      if (Object.keys(m).some(k => k.startsWith("blouse_") && m[k])) types.push("blouse");
      if (Object.keys(m).some(k => k.startsWith("kurta_") && m[k])) types.push("kurta_top");
      if (Object.keys(m).some(k => k.startsWith("lehenga_") && m[k])) types.push("lehenga");
      if (Object.keys(m).some(k => k.startsWith("pant_") && m[k])) types.push("pant");
      if (Object.keys(m).some(k => k.startsWith("kids_") && m[k])) types.push("kids");
      if (Object.keys(m).some(k => k.startsWith("mens_shirt_") && m[k])) types.push("mens_shirt");
      if (Object.keys(m).some(k => k.startsWith("mens_pant_") && m[k])) types.push("mens_pant");
      // Legacy: if old fields have data
      if (types.length === 0 && Object.keys(m).some(k => !k.includes("_") && m[k] && k !== "additional_notes")) types.push("blouse");
      setActiveMeasurementTypes(types);
      setOrderImages(order.images || []);
    } catch (error) {
      toast.error("Failed to load order");
      navigate("/admin/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchCustomers = async (query) => {
    if (!query || query.length < 2 || isEdit) { setCustomerSuggestions([]); return; }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/customers/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomerSuggestions(res.data);
      setShowSuggestions(res.data.length > 0);
    } catch { setCustomerSuggestions([]); }
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_name: customer.name || "",
      customer_phone: customer.phone || "",
      customer_email: customer.email || "",
      customer_age: customer.age || "",
      customer_gender: customer.gender || ""
    }));
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleMeasurementChange = (field, value) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e, imageType = "reference") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isEdit) { toast.error("Please save the order first, then add images"); return; }
    setUploadingImage(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API}/orders/${orderId}/images?image_type=${imageType}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Image uploaded");
      fetchOrder();
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/orders/${orderId}/images/${imageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Image removed");
      fetchOrder();
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const getImageUrl = (img) => {
    const token = localStorage.getItem("token");
    return `${API}/orders/${orderId}/images/${img.id}?token=${token}`;
  };

  const addItem = () => {
    setItems([...items, { ...defaultItem }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
    const tax = subtotal * (formData.tax_percentage / 100);
    const total = subtotal + tax;
    const advancePaid = isEdit 
      ? (existingOrder?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)
      : parseFloat(formData.advance_amount) || 0;
    const balance = total - advancePaid;
    return { subtotal, tax, total, advancePaid, balance };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_date) {
      toast.error("Please fill all required fields");
      return;
    }

    if (items.some(item => !item.service_type || item.cost <= 0)) {
      toast.error("Please fill service type and cost for all items");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isEdit) {
        await axios.put(`${API}/orders/${orderId}`, {
          delivery_date: formData.delivery_date,
          items: items,
          measurements: measurements,
          tax_percentage: formData.tax_percentage,
          description: formData.description
        }, { headers });
        toast.success("Order updated successfully");
        navigate("/admin/orders");
      } else {
        const payload = {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          customer_age: formData.customer_age ? parseInt(formData.customer_age) : null,
          customer_gender: formData.customer_gender,
          customer_dob: "",
          delivery_date: formData.delivery_date,
          items: items,
          measurements: measurements,
          tax_percentage: formData.tax_percentage,
          advance_amount: parseFloat(formData.advance_amount) || 0,
          advance_date: formData.advance_date,
          advance_mode: formData.advance_mode,
          description: formData.description
        };
        const resp = await axios.post(`${API}/orders`, payload, { headers });
        const newOrderId = resp.data?.order_id;
        toast.success("Order created successfully");
        if (generateInvoice && newOrderId) {
          navigate(`/admin/invoice/${newOrderId}`);
        } else {
          navigate("/admin/orders");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.date) {
      toast.error("Please enter amount and date");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/orders/${orderId}/payment`, newPayment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setNewPayment({ amount: "", date: "", mode: "cash", notes: "" });
      fetchOrder();
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const { subtotal, tax, total, advancePaid, balance } = calculateTotals();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
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
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" data-testid="order-form">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/admin/orders")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-['Cormorant_Garamond'] text-3xl font-medium text-[#2D2420]">
              {isEdit ? `Order #${orderId}` : "Create New Order"}
            </h1>
          </div>
          <div className="flex gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/invoice/${orderId}`)}
                className="border-[#EFEBE4] hover:border-[#7E8B76] hover:text-[#7E8B76] rounded-full px-6"
                data-testid="print-invoice-from-form"
              >
                <Printer className="w-4 h-4 mr-2" />
                Invoice
              </Button>
            )}
            {!isEdit && (
              <Button
                type="submit"
                disabled={saving}
                onClick={() => setGenerateInvoice(true)}
                className="bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-full px-6"
                data-testid="save-and-invoice-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save & Invoice"}
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              onClick={() => setGenerateInvoice(false)}
              className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6"
              data-testid="save-order-button"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>

        {/* Customer Details */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 relative">
                <Label className="text-[#5C504A]">Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => { handleInputChange("customer_name", e.target.value); searchCustomers(e.target.value); }}
                  onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  placeholder="Start typing to search..."
                  data-testid="customer-name-input"
                  autoComplete="off"
                />
                {showSuggestions && customerSuggestions.length > 0 && !isEdit && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#EFEBE4] shadow-lg max-h-48 overflow-y-auto" data-testid="customer-suggestions">
                    {customerSuggestions.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F7F2EB] transition-colors border-b border-[#EFEBE4] last:border-0">
                        <p className="text-sm font-medium text-[#2D2420]">{c.name}</p>
                        <p className="text-xs text-[#8A7D76]">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 relative">
                <Label className="text-[#5C504A]">Phone *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => { handleInputChange("customer_phone", e.target.value); searchCustomers(e.target.value); }}
                  onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  placeholder="Start typing to search..."
                  data-testid="customer-phone-input"
                  autoComplete="off"
                />
                {showSuggestions && customerSuggestions.length > 0 && !isEdit && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#EFEBE4] shadow-lg max-h-48 overflow-y-auto">
                    {customerSuggestions.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F7F2EB] transition-colors border-b border-[#EFEBE4] last:border-0">
                        <p className="text-sm font-medium text-[#2D2420]">{c.name}</p>
                        <p className="text-xs text-[#8A7D76]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Email</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange("customer_email", e.target.value)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Age</Label>
                <Input
                  type="number"
                  value={formData.customer_age}
                  onChange={(e) => handleInputChange("customer_age", e.target.value)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Gender</Label>
                <select
                  value={formData.customer_gender || ""}
                  onChange={(e) => handleInputChange("customer_gender", e.target.value)}
                  disabled={isEdit}
                  className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20"
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Delivery Date *</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  data-testid="delivery-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Tax %</Label>
                <Input
                  type="number"
                  value={formData.tax_percentage}
                  onChange={(e) => handleInputChange("tax_percentage", parseFloat(e.target.value) || 0)}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Description / Notes</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items / Measurements */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Items & Measurements
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="border-[#C05C3B] text-[#C05C3B] hover:bg-[#C05C3B]/10 rounded-full"
              data-testid="add-item-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="p-6 bg-[#F7F2EB] rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[#2D2420]">Item {index + 1}</h3>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      className="text-[#B85450] hover:bg-[#B85450]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-[#5C504A]">Service Type *</Label>
                    <select
                      value={item.service_type || ""}
                      onChange={(e) => handleItemChange(index, "service_type", e.target.value)}
                      className="h-10 w-full px-3 text-sm bg-white border border-[#EFEBE4] rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20"
                      data-testid={`service-type-${index}`}
                    >
                      <option value="">Select service</option>
                      {SERVICE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Cost (₹) *</Label>
                    <Input
                      type="number"
                      value={item.cost}
                      onChange={(e) => handleItemChange(index, "cost", parseFloat(e.target.value) || 0)}
                      className="bg-white border-[#EFEBE4] rounded-xl"
                      data-testid={`item-cost-${index}`}
                    />
                  </div>
                </div>

                {/* Blouse Type Radio */}
                {item.service_type?.toLowerCase().includes("blouse") && (
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Blouse Type</Label>
                    <RadioGroup
                      value={item.blouse_type}
                      onValueChange={(value) => handleItemChange(index, "blouse_type", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="with_cups" id={`cups-yes-${index}`} />
                        <Label htmlFor={`cups-yes-${index}`} className="font-normal">With Cups</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="without_cups" id={`cups-no-${index}`} />
                        <Label htmlFor={`cups-no-${index}`} className="font-normal">Without Cups</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Garment Options - Per Item */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Padded</Label>
                    <RadioGroup value={item.padded || "no"} onValueChange={(v) => handleItemChange(index, "padded", v)} className="flex gap-6">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id={`pad-y-${index}`} /><Label htmlFor={`pad-y-${index}`} className="font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id={`pad-n-${index}`} /><Label htmlFor={`pad-n-${index}`} className="font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Princess Cut</Label>
                    <RadioGroup value={item.princess_cut || "no"} onValueChange={(v) => handleItemChange(index, "princess_cut", v)} className="flex gap-6">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id={`pc-y-${index}`} /><Label htmlFor={`pc-y-${index}`} className="font-normal">Yes</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="no" id={`pc-n-${index}`} /><Label htmlFor={`pc-n-${index}`} className="font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Open</Label>
                    <RadioGroup value={item.open_style || "back"} onValueChange={(v) => handleItemChange(index, "open_style", v)} className="flex gap-6">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="front" id={`op-f-${index}`} /><Label htmlFor={`op-f-${index}`} className="font-normal">Front</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="back" id={`op-b-${index}`} /><Label htmlFor={`op-b-${index}`} className="font-normal">Back</Label></div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Neck Designs with Reference Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Front Neck Design</Label>
                    <Textarea
                      value={item.front_neck_design}
                      onChange={(e) => handleItemChange(index, "front_neck_design", e.target.value)}
                      className="bg-white border-[#EFEBE4] rounded-xl"
                      rows={2}
                      placeholder="Describe front neck design..."
                    />
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#C05C3B]/30 rounded-lg cursor-pointer hover:bg-[#C05C3B]/5 transition-colors text-xs">
                      <Upload className="w-3.5 h-3.5 text-[#C05C3B]" />
                      <span className="text-[#5C504A]">{uploadingImage ? "Uploading..." : "Upload front neck reference"}</span>
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `front_neck_${index}`)} accept=".jpg,.jpeg,.png,.webp" disabled={uploadingImage} />
                    </label>
                    {/* Show front neck images */}
                    {orderImages.filter(img => img.image_type === `front_neck_${index}`).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {orderImages.filter(img => img.image_type === `front_neck_${index}`).map((img) => (
                          <div key={img.id} className="group relative w-16 h-16 rounded-lg overflow-hidden bg-[#F7F2EB]">
                            <img src={getImageUrl(img)} alt="Front neck ref" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button size="icon" variant="destructive" onClick={() => handleDeleteImage(img.id)} className="rounded-full w-6 h-6 bg-[#B85450]/90"><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Back Neck Design</Label>
                    <Textarea
                      value={item.back_neck_design}
                      onChange={(e) => handleItemChange(index, "back_neck_design", e.target.value)}
                      className="bg-white border-[#EFEBE4] rounded-xl"
                      rows={2}
                      placeholder="Describe back neck design..."
                    />
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#C05C3B]/30 rounded-lg cursor-pointer hover:bg-[#C05C3B]/5 transition-colors text-xs">
                      <Upload className="w-3.5 h-3.5 text-[#C05C3B]" />
                      <span className="text-[#5C504A]">{uploadingImage ? "Uploading..." : "Upload back neck reference"}</span>
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `back_neck_${index}`)} accept=".jpg,.jpeg,.png,.webp" disabled={uploadingImage} />
                    </label>
                    {/* Show back neck images */}
                    {orderImages.filter(img => img.image_type === `back_neck_${index}`).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {orderImages.filter(img => img.image_type === `back_neck_${index}`).map((img) => (
                          <div key={img.id} className="group relative w-16 h-16 rounded-lg overflow-hidden bg-[#F7F2EB]">
                            <img src={getImageUrl(img)} alt="Back neck ref" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button size="icon" variant="destructive" onClick={() => handleDeleteImage(img.id)} className="rounded-full w-6 h-6 bg-[#B85450]/90"><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Reference Images */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#5C504A]">Reference Images</Label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#C05C3B]/30 rounded-lg cursor-pointer hover:bg-[#C05C3B]/5 transition-colors text-xs">
                      <Upload className="w-3.5 h-3.5 text-[#C05C3B]" />
                      <span className="text-[#5C504A]">{uploadingImage ? "..." : "Upload"}</span>
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `item_${index}_ref`)} accept=".jpg,.jpeg,.png,.webp" disabled={uploadingImage} />
                    </label>
                  </div>
                  {orderImages.filter(img => img.image_type?.startsWith(`item_${index}`) || img.image_type?.includes(`_${index}`)).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {orderImages.filter(img => img.image_type?.startsWith(`item_${index}`) || img.image_type?.includes(`_${index}`)).map((img) => (
                          <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-[#F7F2EB]">
                            <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button size="icon" variant="destructive" onClick={() => handleDeleteImage(img.id)} className="rounded-full w-7 h-7 bg-[#B85450]/90"><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-[#5C504A]">Description / Notes</Label>
                  <Textarea
                    value={item.additional_notes}
                    onChange={(e) => handleItemChange(index, "additional_notes", e.target.value)}
                    className="bg-white border-[#EFEBE4] rounded-xl"
                    rows={2}
                    placeholder="Any special instructions, fabric details, or description..."
                    data-testid={`additional-notes-${index}`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Measurements — Add by Type */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Measurement Type */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-[#8A7D76]">Add Measurement Chart</Label>
                <select value={selectedMeasurementType} onChange={(e) => setSelectedMeasurementType(e.target.value)}
                  className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20"
                  data-testid="measurement-type-select">
                  <option value="">Select type...</option>
                  {[
                    { value: "blouse", label: "Blouse" },
                    { value: "kurta_top", label: "Kurta Top" },
                    { value: "lehenga", label: "Lehenga" },
                    { value: "pant", label: "Pant" },
                    { value: "kids", label: "Kids" },
                    { value: "mens_shirt", label: "Men's Shirt" },
                    { value: "mens_pant", label: "Men's Pant" },
                  ].filter(t => !activeMeasurementTypes.includes(t.value)).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Button type="button" onClick={() => {
                if (selectedMeasurementType && !activeMeasurementTypes.includes(selectedMeasurementType)) {
                  setActiveMeasurementTypes([...activeMeasurementTypes, selectedMeasurementType]);
                  setSelectedMeasurementType("");
                }
              }} disabled={!selectedMeasurementType}
                className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-xl h-10 px-5" data-testid="add-measurement-btn">
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
            </div>

            {activeMeasurementTypes.length === 0 && (
              <p className="text-center text-sm text-[#8A7D76] py-6">Select a measurement type above and click Add</p>
            )}

            {/* Render active measurement sections */}
            {activeMeasurementTypes.map(type => {
              const configs = {
                blouse: { label: "Blouse", color: "#C05C3B", fields: [
                  { key: "blouse_length", label: "Length" }, { key: "blouse_shoulder", label: "Shoulder" },
                  { key: "blouse_cross_back", label: "Cross Back" }, { key: "blouse_back_deep_balance", label: "Back Deep / Balance" },
                  { key: "blouse_upper_chest", label: "Upper Chest" }, { key: "blouse_chest", label: "Chest" },
                  { key: "blouse_waist", label: "Waist" }, { key: "blouse_arm_round", label: "Arm Round" },
                  { key: "blouse_bicep", label: "Bicep" }, { key: "blouse_sleeve_length", label: "Sleeve Length" },
                  { key: "blouse_sleeve_round", label: "Sleeve Round" }, { key: "blouse_point", label: "Point" },
                  { key: "blouse_bust_length", label: "Bust Length" }, { key: "blouse_front_shoulder", label: "Front Shoulder" },
                  { key: "blouse_cross_front", label: "Cross Front" }, { key: "blouse_front_deep", label: "Front Deep" },
                ], neck: true, neckPrefix: "blouse" },
                kurta_top: { label: "Kurta Top", color: "#7E8B76", fields: [
                  { key: "kurta_length", label: "Length" }, { key: "kurta_shoulder", label: "Shoulder" },
                  { key: "kurta_cross_back", label: "Cross Back" }, { key: "kurta_back_deep", label: "Back Deep" },
                  { key: "kurta_front_deep", label: "Front Deep" }, { key: "kurta_upper_chest", label: "Upper Chest" },
                  { key: "kurta_waist", label: "Waist" }, { key: "kurta_waist_length", label: "Waist Length" },
                  { key: "kurta_slit_open_length", label: "Slit Open Length" }, { key: "kurta_hip_round", label: "Hip Round" },
                  { key: "kurta_sleeve_length", label: "Sleeve Length" }, { key: "kurta_sleeve_round", label: "Sleeve Round" },
                  { key: "kurta_bicep", label: "Bicep" }, { key: "kurta_cross_front", label: "Cross Front" },
                  { key: "kurta_front_shoulder", label: "Front Shoulder" },
                ], neck: true, neckPrefix: "kurta" },
                lehenga: { label: "Lehenga", color: "#D19B5A", fields: [
                  { key: "lehenga_length", label: "Length" }, { key: "lehenga_waist", label: "Waist" }, { key: "lehenga_hip", label: "Hip" },
                ] },
                pant: { label: "Pant", color: "#7A8B99", fields: [
                  { key: "pant_length", label: "Length" }, { key: "pant_waist", label: "Waist" },
                  { key: "pant_hip_round", label: "Hip Round" }, { key: "pant_high_round", label: "High Round" },
                  { key: "pant_knee_round", label: "Knee Round" }, { key: "pant_bottom", label: "Bottom" },
                  { key: "pant_new_length", label: "New Length" },
                ] },
                kids: { label: "Kids", color: "#C05C3B", fields: [
                  { key: "kids_length", label: "Length" }, { key: "kids_shoulder", label: "Shoulder" },
                  { key: "kids_chest", label: "Chest" }, { key: "kids_waist", label: "Waist" },
                  { key: "kids_hip", label: "Hip" }, { key: "kids_sleeve_length", label: "Sleeve Length" },
                  { key: "kids_arm_round", label: "Arm Round" }, { key: "kids_neck_round", label: "Neck Round" },
                  { key: "kids_back_length", label: "Back Length" }, { key: "kids_front_length", label: "Front Length" },
                ] },
                mens_shirt: { label: "Men's Shirt", color: "#2D2420", fields: [
                  { key: "mens_shirt_length", label: "Length" }, { key: "mens_shirt_shoulder", label: "Shoulder" },
                  { key: "mens_shirt_chest", label: "Chest" }, { key: "mens_shirt_waist", label: "Waist" },
                  { key: "mens_shirt_sleeve_length", label: "Sleeve Length" }, { key: "mens_shirt_collar", label: "Collar" },
                  { key: "mens_shirt_bicep", label: "Bicep" }, { key: "mens_shirt_cuff", label: "Cuff" },
                  { key: "mens_shirt_cross_back", label: "Cross Back" }, { key: "mens_shirt_cross_front", label: "Cross Front" },
                ] },
                mens_pant: { label: "Men's Pant", color: "#5C504A", fields: [
                  { key: "mens_pant_length", label: "Length" }, { key: "mens_pant_waist", label: "Waist" },
                  { key: "mens_pant_hip", label: "Hip" }, { key: "mens_pant_thigh", label: "Thigh" },
                  { key: "mens_pant_knee", label: "Knee" }, { key: "mens_pant_bottom", label: "Bottom" },
                  { key: "mens_pant_inseam", label: "Inseam" }, { key: "mens_pant_crotch", label: "Crotch" },
                ] },
              };
              const cfg = configs[type];
              if (!cfg) return null;
              return (
                <div key={type} className="space-y-4 p-5 bg-[#F7F2EB]/50 rounded-xl border border-[#EFEBE4]">
                  <div className="flex items-center justify-between border-b border-[#2D2420]/10 pb-2">
                    <span className="text-xs uppercase tracking-[0.15em] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <button type="button" onClick={() => setActiveMeasurementTypes(activeMeasurementTypes.filter(t => t !== type))}
                      className="text-xs text-[#B85450] hover:text-[#B85450]/80 uppercase tracking-wider">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {cfg.fields.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] text-[#8A7D76]">{label}</Label>
                        <Input value={measurements[key] || ""} onChange={(e) => handleMeasurementChange(key, e.target.value)}
                          className="bg-white border-[#EFEBE4] focus:border-[#C05C3B] rounded-lg h-9 text-sm" placeholder="—" data-testid={`measurement-${key}`} />
                      </div>
                    ))}
                  </div>
                  {cfg.neck && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[#8A7D76]">Front Neck</Label>
                        <Input value={measurements[`${cfg.neckPrefix}_front_neck`] || ""} onChange={(e) => handleMeasurementChange(`${cfg.neckPrefix}_front_neck`, e.target.value)}
                          className="bg-white border-[#EFEBE4] focus:border-[#C05C3B] rounded-lg h-9 text-sm" placeholder="—" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-[#8A7D76]">Back Neck</Label>
                        <Input value={measurements[`${cfg.neckPrefix}_back_neck`] || ""} onChange={(e) => handleMeasurementChange(`${cfg.neckPrefix}_back_neck`, e.target.value)}
                          className="bg-white border-[#EFEBE4] focus:border-[#C05C3B] rounded-lg h-9 text-sm" placeholder="—" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Additional Details</Label>
              <Textarea value={measurements.additional_notes || ""} onChange={(e) => handleMeasurementChange("additional_notes", e.target.value)}
                className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl" rows={2} placeholder="Any special measurement notes..." />
            </div>
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Billing Summary
            </CardTitle>
            {isEdit && existingOrder?.balance > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(true)}
                className="border-[#7E8B76] text-[#7E8B76] hover:bg-[#7E8B76]/10 rounded-full"
                data-testid="add-payment-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Balance & Invoice */}
              <div className="bg-[#F7F2EB] rounded-2xl p-6 space-y-3">
                <div className="flex justify-between text-[#5C504A]">
                  <span>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#5C504A]">
                  <span>Tax ({formData.tax_percentage}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-[#2D2420] pt-2 border-t border-[#EFEBE4]">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-[#7E8B76]">
                  <span>Paid</span>
                  <span>{formatCurrency(advancePaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-[#C05C3B]">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
                {isEdit && (
                  <div className="pt-3 border-t border-[#EFEBE4]">
                    <Button
                      type="button"
                      onClick={() => navigate(`/admin/invoice/${orderId}`)}
                      className="w-full bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none text-xs uppercase tracking-[0.1em]"
                      data-testid="billing-view-invoice"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      View Invoice
                    </Button>
                  </div>
                )}
              </div>

              {/* Advance Payment (New Order Only) */}
              {!isEdit && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Advance Amount</Label>
                    <Input
                      type="number"
                      value={formData.advance_amount}
                      onChange={(e) => handleInputChange("advance_amount", e.target.value)}
                      className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                      data-testid="advance-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Payment Date</Label>
                    <Input
                      type="date"
                      value={formData.advance_date}
                      onChange={(e) => handleInputChange("advance_date", e.target.value)}
                      className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Payment Mode</Label>
                    <select
                      value={formData.advance_mode}
                      onChange={(e) => handleInputChange("advance_mode", e.target.value)}
                      className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20"
                    >
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Payment History (Edit Mode) */}
              {isEdit && existingOrder?.payments?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[#5C504A]">Payment History</Label>
                  <div className="space-y-2">
                    {existingOrder.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#F7F2EB] rounded-xl p-4">
                        <div>
                          <span className="font-medium text-[#2D2420]">{formatCurrency(payment.amount)}</span>
                          <span className="text-sm text-[#8A7D76] ml-2">
                            via {payment.mode?.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-[#8A7D76]">{payment.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Amount *</Label>
              <Input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Date *</Label>
              <Input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Mode</Label>
              <select
                value={newPayment.mode}
                onChange={(e) => setNewPayment({ ...newPayment, mode: e.target.value })}
                className="h-10 w-full px-3 text-sm bg-[#F7F2EB] border-transparent rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C05C3B]/20"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Notes</Label>
              <Input
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="border-[#EFEBE4] rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full"
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default OrderForm;
