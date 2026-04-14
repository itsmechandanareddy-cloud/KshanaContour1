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
import { ArrowLeft, Plus, Trash2, IndianRupee, Save } from "lucide-react";
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
  // Garment options
  padded: "no",
  princess_cut: "no",
  open_style: "back",
  // Main measurements
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
  // Neckline measurements
  front_neck: "",
  back_neck: "",
  additional_notes: "",
  cost: 0
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
  const [existingOrder, setExistingOrder] = useState(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: "", mode: "cash", notes: "" });

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
                  onChange={(e) => handleInputChange("customer_dob", e.target.value)}
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
                  onChange={(e) => handleInputChange("customer_age", e.target.value)}
                  disabled={isEdit}
                  className="bg-[#F7F2EB] border-transparent focus:border-[#C05C3B] rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#5C504A]">Gender</Label>
                <Select 
                  value={formData.customer_gender} 
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
                      value={item.service_type} 
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

                {/* Garment Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Padded</Label>
                    <RadioGroup
                      value={item.padded || "no"}
                      onValueChange={(value) => handleItemChange(index, "padded", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`padded-yes-${index}`} />
                        <Label htmlFor={`padded-yes-${index}`} className="font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`padded-no-${index}`} />
                        <Label htmlFor={`padded-no-${index}`} className="font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Princess Cut</Label>
                    <RadioGroup
                      value={item.princess_cut || "no"}
                      onValueChange={(value) => handleItemChange(index, "princess_cut", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`princess-yes-${index}`} />
                        <Label htmlFor={`princess-yes-${index}`} className="font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`princess-no-${index}`} />
                        <Label htmlFor={`princess-no-${index}`} className="font-normal">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#5C504A]">Open</Label>
                    <RadioGroup
                      value={item.open_style || "back"}
                      onValueChange={(value) => handleItemChange(index, "open_style", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="front" id={`open-front-${index}`} />
                        <Label htmlFor={`open-front-${index}`} className="font-normal">Front</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="back" id={`open-back-${index}`} />
                        <Label htmlFor={`open-back-${index}`} className="font-normal">Back</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Neck Designs */}
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
                  </div>
                </div>

                {/* Measurements Grid */}
                <div>
                  <Label className="text-[#5C504A] text-sm font-semibold mb-3 block">Body Measurements</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[
                      { key: "length", label: "Length" },
                      { key: "shoulder", label: "Shoulder" },
                      { key: "sleeve_length", label: "Sleeve Length" },
                      { key: "arm_round", label: "Arm Round" },
                      { key: "bicep", label: "Bicep" },
                      { key: "upper_chest", label: "Upper Chest" },
                      { key: "chest", label: "Chest" },
                      { key: "waist", label: "Waist" },
                      { key: "point", label: "Point" },
                      { key: "bust_length", label: "Bust Length" },
                      { key: "front_length", label: "Front Length" },
                      { key: "cross_front", label: "Cross Front" },
                      { key: "back_deep_balance", label: "Back Deep / Balance" },
                      { key: "cross_back", label: "Cross Back" },
                      { key: "sleeve_round", label: "Sleeve Round" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-[#8A7D76]">{label}</Label>
                        <Input
                          value={item[key] || ""}
                          onChange={(e) => handleItemChange(index, key, e.target.value)}
                          className="bg-white border-[#EFEBE4] rounded-lg h-10"
                          placeholder="e.g., 36"
                          data-testid={`measurement-${key}-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neckline Measurements */}
                <div>
                  <Label className="text-[#5C504A] text-sm font-semibold mb-3 block">Neckline Measurements</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#8A7D76]">Front Neck</Label>
                      <Input
                        value={item.front_neck || ""}
                        onChange={(e) => handleItemChange(index, "front_neck", e.target.value)}
                        className="bg-white border-[#EFEBE4] rounded-lg h-10"
                        placeholder="e.g., 7"
                        data-testid={`measurement-front-neck-${index}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#8A7D76]">Back Neck</Label>
                      <Input
                        value={item.back_neck || ""}
                        onChange={(e) => handleItemChange(index, "back_neck", e.target.value)}
                        className="bg-white border-[#EFEBE4] rounded-lg h-10"
                        placeholder="e.g., 6"
                        data-testid={`measurement-back-neck-${index}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label className="text-[#5C504A]">Additional Details</Label>
                  <Textarea
                    value={item.additional_notes}
                    onChange={(e) => handleItemChange(index, "additional_notes", e.target.value)}
                    className="bg-white border-[#EFEBE4] rounded-xl"
                    rows={2}
                    placeholder="Any special instructions or additional details..."
                    data-testid={`additional-notes-${index}`}
                  />
                </div>
              </div>
            ))}
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
