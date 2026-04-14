import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, API } from "../../App";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  ArrowLeft, Calendar, IndianRupee, Clock, CheckCircle, 
  Truck, Package, Ruler, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-[#D19B5A]/20 text-[#8C3B24]",
  in_progress: "bg-[#7A8B99]/20 text-[#5C504A]",
  ready: "bg-[#7E8B76]/20 text-[#4A5D40]",
  delivered: "bg-[#7E8B76]/30 text-[#3D4D35]"
};

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  ready: "Ready for Pickup",
  delivered: "Delivered"
};

const OrderDetail = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (error) {
      toast.error("Failed to load order details");
      navigate("/customer/orders");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-[#EFEBE4] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/customer/orders")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2D2420]">
              Order #{order.order_id}
            </h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
      </header>

      {/* Order Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6" data-testid="order-detail">
        {/* Order Info */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#8A7D76]" />
                <div>
                  <p className="text-sm text-[#8A7D76]">Order Date</p>
                  <p className="font-medium text-[#2D2420]">{formatDate(order.order_date || order.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#8A7D76]" />
                <div>
                  <p className="text-sm text-[#8A7D76]">Delivery Date</p>
                  <p className="font-medium text-[#2D2420]">{formatDate(order.delivery_date)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C05C3B]" />
              Items ({order.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items?.map((item, index) => (
              <div key={index} className="p-4 bg-[#F7F2EB] rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-[#2D2420]">{item.service_type}</h4>
                    {item.blouse_type && (
                      <p className="text-sm text-[#8A7D76]">
                        {item.blouse_type === 'with_cups' ? 'With Cups' : 'Without Cups'}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-[#C05C3B]">{formatCurrency(item.cost)}</p>
                </div>

                {/* Neck Designs */}
                {(item.front_neck_design || item.back_neck_design) && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#EFEBE4]">
                    {item.front_neck_design && (
                      <div>
                        <p className="text-xs text-[#8A7D76] mb-1">Front Neck Design</p>
                        <p className="text-sm text-[#5C504A]">{item.front_neck_design}</p>
                      </div>
                    )}
                    {item.back_neck_design && (
                      <div>
                        <p className="text-xs text-[#8A7D76] mb-1">Back Neck Design</p>
                        <p className="text-sm text-[#5C504A]">{item.back_neck_design}</p>
                      </div>
                    )}
                  </div>
                )}

                {item.additional_notes && (
                  <div className="pt-3 border-t border-[#EFEBE4]">
                    <p className="text-xs text-[#8A7D76] mb-1">Notes</p>
                    <p className="text-sm text-[#5C504A]">{item.additional_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Measurements (Order Level) */}
        {order.measurements && Object.values(order.measurements).some(v => v && v !== "no") && (
          <Card className="bg-white border-[#EFEBE4]">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#C05C3B]" />
                Measurements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Garment Options */}
              {(order.measurements.padded === 'yes' || order.measurements.princess_cut === 'yes' || order.measurements.open_style) && (
                <div className="flex flex-wrap gap-2">
                  {order.measurements.padded === 'yes' && <span className="px-3 py-1 bg-[#C05C3B]/10 text-[#C05C3B] rounded-full text-xs font-medium">Padded</span>}
                  {order.measurements.princess_cut === 'yes' && <span className="px-3 py-1 bg-[#7E8B76]/10 text-[#4A5D40] rounded-full text-xs font-medium">Princess Cut</span>}
                  {order.measurements.open_style && <span className="px-3 py-1 bg-[#D19B5A]/10 text-[#8C3B24] rounded-full text-xs font-medium">Open: {order.measurements.open_style}</span>}
                </div>
              )}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { key: "length", label: "Length" }, { key: "shoulder", label: "Shoulder" },
                  { key: "sleeve_length", label: "Sleeve L." }, { key: "arm_round", label: "Arm Round" },
                  { key: "bicep", label: "Bicep" }, { key: "upper_chest", label: "Upper Chest" },
                  { key: "chest", label: "Chest" }, { key: "waist", label: "Waist" },
                  { key: "point", label: "Point" }, { key: "bust_length", label: "Bust Length" },
                  { key: "front_length", label: "Front L." }, { key: "cross_front", label: "Cross Front" },
                  { key: "back_deep_balance", label: "Back Deep" }, { key: "cross_back", label: "Cross Back" },
                  { key: "sleeve_round", label: "Sleeve R." }, { key: "front_neck", label: "Front Neck" },
                  { key: "back_neck", label: "Back Neck" },
                ].filter(m => order.measurements[m.key]).map(({ key, label }) => (
                  <div key={key} className="text-center p-2 bg-[#F7F2EB] rounded-lg">
                    <p className="text-xs text-[#8A7D76]">{label}</p>
                    <p className="font-medium text-[#2D2420]">{order.measurements[key]}</p>
                  </div>
                ))}
              </div>
              {order.measurements.additional_notes && (
                <p className="text-sm text-[#5C504A] bg-[#F7F2EB] p-3 rounded-lg italic">{order.measurements.additional_notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Description */}
        {order.description && (
          <Card className="bg-white border-[#EFEBE4]">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
                Order Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#5C504A]">{order.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-[#C05C3B]" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-[#5C504A]">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5C504A]">
                <span>Tax ({order.tax_percentage}%)</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-[#2D2420] pt-3 border-t border-[#EFEBE4]">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment History */}
            {order.payments?.length > 0 && (
              <div className="pt-4 border-t border-[#EFEBE4]">
                <p className="text-sm font-medium text-[#5C504A] mb-3">Payment History</p>
                <div className="space-y-2">
                  {order.payments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#F7F2EB] rounded-xl">
                      <div>
                        <span className="font-medium text-[#7E8B76]">{formatCurrency(payment.amount)}</span>
                        <span className="text-sm text-[#8A7D76] ml-2">via {payment.mode?.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm text-[#8A7D76]">{payment.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Balance */}
            <div className={`flex justify-between items-center p-4 rounded-xl ${
              order.balance > 0 ? 'bg-[#C05C3B]/10' : 'bg-[#7E8B76]/10'
            }`}>
              <span className={`font-medium ${order.balance > 0 ? 'text-[#C05C3B]' : 'text-[#7E8B76]'}`}>
                {order.balance > 0 ? 'Balance Due' : 'Payment Complete'}
              </span>
              <span className={`text-lg font-semibold ${order.balance > 0 ? 'text-[#C05C3B]' : 'text-[#7E8B76]'}`}>
                {formatCurrency(order.balance)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contact for Queries */}
        <Card className="bg-[#F7F2EB] border-[#EFEBE4]">
          <CardContent className="p-6 text-center">
            <p className="text-[#5C504A] mb-4">Have questions about your order?</p>
            <a 
              href="https://wa.me/919187202605"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full">
                Chat on WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default OrderDetail;
