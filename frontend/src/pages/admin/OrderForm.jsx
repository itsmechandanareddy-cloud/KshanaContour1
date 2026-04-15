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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, IndianRupee, Save, Printer, Upload, X, Image as ImageIcon } from "lucide-react";
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
  front_neck_design: "",
  back_neck_design: "",
  additional_notes: "",
  cost: 0
};

const defaultMeasurements = {
  padded: "no",
  princess_cut: "no",
  open_style: "back",
  length: "",
  shoulder: "",
  sleeve_length: "",
  arm_round: "",
  bicep: "",
  upper_chest: "",
  chest: "",
  waist: "",
  point: "",
  bust_length: "",
  front_length: "",
  cross_front: "",
  back_deep_balance: "",
  cross_back: "",
  sleeve_round: "",
  front_neck: "",
  back_neck: "",
  additional_notes: ""
};

const OrderForm = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const isEdit = !!orderId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_age: "",
    customer_gender: "",
    customer_dob: "",
    delivery_date: "",
    description: "",
    tax_percentage: 18,
    advance_amount: 0,
    advance_date: new Date().toISOString().split('T')[0],
    advance_mode: "cash"
  });
  
  const [items, setItems] = useState([{ ...defaultItem }]);
  const [measurements, setMeasurements] = useState({ ...defaultMeasurements });
  const [existingOrder, setExistingOrder] = useState(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: "", mode: "cash", notes: "" });
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
        customer_dob: order.customer_dob || "",
        delivery_date: order.delivery_date?.split('T')[0] || "",
        description: order.description || "",
        tax_percentage: order.tax_percentage || 18,
        advance_amount: 0,
        advance_date: new Date().toISOString().split('T')[0],
        advance_mode: "cash"
      });
      setItems(order.items?.length > 0 ? order.items : [{ ...defaultItem }]);
      setMeasurements(order.measurements || defaultMeasurements);
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
    
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_dob || !formData.delivery_date) {
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
      } else {
        const payload = {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          customer_age: formData.customer_age ? parseInt(formData.customer_age) : null,
          customer_gender: formData.customer_gender,
          customer_dob: formData.customer_dob,
          delivery_date: formData.delivery_date,
          items: items,
          measurements: measurements,
          tax_percentage: formData.tax_percentage,
          advance_amount: parseFloat(formData.advance_amount) || 0,
          advance_date: formData.advance_date,
          advance_mode: formData.advance_mode,
          description: formData.description
        };
        await axios.post(`${API}/orders`, payload, { headers });
        toast.success("Order created successfully");
      }
      
      navigate("/admin/orders");
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
      setNewPayment({ amount: 0, date: "", mode: "cash", notes: "" });
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
            <Button
              type="submit"
              disabled={saving}
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
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  data-testid="customer-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Phone *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  data-testid="customer-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.customer_dob}
                  onChange={(e) => {
                    handleInputChange("customer_dob", e.target.value);
                    if (e.target.value) {
                      const today = new Date();
                      const birth = new Date(e.target.value);
                      let age = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                      handleInputChange("customer_age", age > 0 ? age : "");
                    }
                  }}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                  data-testid="customer-dob-input"
                />
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
                  readOnly
                  className="bg-[#F7F2EB] border-transparent rounded-xl cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Gender</Label>
                <Select 
                  value={formData.customer_gender || undefined} 
                  onValueChange={(value) => handleInputChange("customer_gender", value)}
                  disabled={isEdit}
                >
                  <SelectTrigger className="bg-[#F7F2EB] border-transparent rounded-xl">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
                    <Select 
                      value={item.service_type || undefined} 
                      onValueChange={(value) => handleItemChange(index, "service_type", value)}
                    >
                      <SelectTrigger className="bg-white border-[#EFEBE4] rounded-xl" data-testid={`service-type-${index}`}>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    {isEdit && (
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#C05C3B]/30 rounded-lg cursor-pointer hover:bg-[#C05C3B]/5 transition-colors text-xs">
                        <Upload className="w-3.5 h-3.5 text-[#C05C3B]" />
                        <span className="text-[#5C504A]">{uploadingImage ? "Uploading..." : "Add front neck reference"}</span>
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `front_neck_${index}`)} accept=".jpg,.jpeg,.png,.webp" disabled={uploadingImage} />
                      </label>
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
                    {isEdit && (
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#C05C3B]/30 rounded-lg cursor-pointer hover:bg-[#C05C3B]/5 transition-colors text-xs">
                        <Upload className="w-3.5 h-3.5 text-[#C05C3B]" />
                        <span className="text-[#5C504A]">{uploadingImage ? "Uploading..." : "Add back neck reference"}</span>
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `back_neck_${index}`)} accept=".jpg,.jpeg,.png,.webp" disabled={uploadingImage} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Item Reference Images */}
                {isEdit && (
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
                )}

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

        {/* Measurements (Single Section for Order) */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Garment Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Padded</Label>
                <RadioGroup value={measurements.padded || "no"} onValueChange={(v) => handleMeasurementChange("padded", v)} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="m-padded-yes" /><Label htmlFor="m-padded-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="m-padded-no" /><Label htmlFor="m-padded-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Princess Cut</Label>
                <RadioGroup value={measurements.princess_cut || "no"} onValueChange={(v) => handleMeasurementChange("princess_cut", v)} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="m-princess-yes" /><Label htmlFor="m-princess-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="m-princess-no" /><Label htmlFor="m-princess-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Open</Label>
                <RadioGroup value={measurements.open_style || "back"} onValueChange={(v) => handleMeasurementChange("open_style", v)} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="front" id="m-open-front" /><Label htmlFor="m-open-front" className="font-normal">Front</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="back" id="m-open-back" /><Label htmlFor="m-open-back" className="font-normal">Back</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Body Measurements */}
            <div>
              <Label className="text-[#5C504A] text-sm font-semibold mb-3 block">Body Measurements</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[
                  { key: "length", label: "Length" }, { key: "shoulder", label: "Shoulder" },
                  { key: "sleeve_length", label: "Sleeve Length" }, { key: "arm_round", label: "Arm Round" },
                  { key: "bicep", label: "Bicep" }, { key: "upper_chest", label: "Upper Chest" },
                  { key: "chest", label: "Chest" }, { key: "waist", label: "Waist" },
                  { key: "point", label: "Point" }, { key: "bust_length", label: "Bust Length" },
                  { key: "front_length", label: "Front Length" }, { key: "cross_front", label: "Cross Front" },
                  { key: "back_deep_balance", label: "Back Deep / Balance" }, { key: "cross_back", label: "Cross Back" },
                  { key: "sleeve_round", label: "Sleeve Round" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-[#8A7D76]">{label}</Label>
                    <Input
                      value={measurements[key] || ""}
                      onChange={(e) => handleMeasurementChange(key, e.target.value)}
                      className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-lg h-10"
                      placeholder="e.g., 36"
                      data-testid={`measurement-${key}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Neckline */}
            <div>
              <Label className="text-[#5C504A] text-sm font-semibold mb-3 block">Neckline Measurements</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-[#8A7D76]">Front Neck</Label>
                  <Input value={measurements.front_neck || ""} onChange={(e) => handleMeasurementChange("front_neck", e.target.value)}
                    className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-lg h-10" placeholder="e.g., 7" data-testid="measurement-front-neck" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#8A7D76]">Back Neck</Label>
                  <Input value={measurements.back_neck || ""} onChange={(e) => handleMeasurementChange("back_neck", e.target.value)}
                    className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-lg h-10" placeholder="e.g., 6" data-testid="measurement-back-neck" />
                </div>
              </div>
            </div>

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
              {/* Summary */}
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
                    <Select 
                      value={formData.advance_mode} 
                      onValueChange={(value) => handleInputChange("advance_mode", value)}
                    >
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
              <Select 
                value={newPayment.mode} 
                onValueChange={(value) => setNewPayment({ ...newPayment, mode: value })}
              >
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
