import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Printer, MessageCircle } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/5x4gmkkq_image.png";

const Invoice = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
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
      navigate("/admin/orders");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handlePrint = () => window.print();

  const sendInvoiceWhatsApp = () => {
    if (!order) return;
    const items = order.items?.map((item, i) => 
      `${i + 1}. ${item.service_type} — ${formatCurrency(item.cost)}`
    ).join("\n") || "";
    
    const msg = [
      `*INVOICE — Kshana Contour*`,
      `Order: #${order.order_id}`,
      `Date: ${formatDate(order.order_date || order.created_at)}`,
      ``,
      `*Customer:* ${order.customer_name}`,
      `*Delivery:* ${formatDate(order.delivery_date)}`,
      ``,
      `*Items:*`,
      items,
      ``,
      `Subtotal: ${formatCurrency(order.subtotal)}`,
      `Tax (${order.tax_percentage}%): ${formatCurrency(order.tax_amount)}`,
      `*Total: ${formatCurrency(order.total)}*`,
      `Paid: ${formatCurrency((order.payments || []).reduce((s, p) => s + p.amount, 0))}`,
      order.balance > 0 ? `*Balance Due: ${formatCurrency(order.balance)}*` : `_PAID IN FULL_`,
      ``,
      `Thank you for choosing Kshana Contour!`,
    ].join("\n");

    const phone = order.customer_phone?.replace(/\D/g, "");
    const fullPhone = phone?.startsWith("91") ? phone : `91${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div>
      </div>
    );
  }

  if (!order) return null;

  const measurementFields = [
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
    { key: "back_deep_balance", label: "Back Deep/Bal." },
    { key: "cross_back", label: "Cross Back" },
    { key: "sleeve_round", label: "Sleeve Round" },
    { key: "front_neck", label: "Front Neck" },
    { key: "back_neck", label: "Back Neck" },
  ];

  return (
    <>
      {/* Print Controls - hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-6 py-3 flex items-center gap-4 shadow-sm">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="flex-1 font-medium text-[#2D2420]">Invoice #{order.order_id}</span>
        <Button
          onClick={sendInvoiceWhatsApp}
          className="bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full px-6"
          data-testid="send-invoice-whatsapp"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Send via WhatsApp
        </Button>
        <Button
          onClick={handlePrint}
          className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6"
          data-testid="print-invoice-btn"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Content */}
      <div className="max-w-[800px] mx-auto bg-white print:shadow-none shadow-lg my-16 print:my-0" data-testid="invoice-page">
        <div className="p-8 print:p-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#2D2420] pb-6 mb-6">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Kshana Contour" className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <h1 className="text-2xl font-bold text-[#2D2420]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Kshana Contour
                </h1>
                <p className="text-xs text-[#8A7D76] tracking-[0.15em]">CLASSY. AESTHETIC. ELEGANT</p>
                <p className="text-xs text-[#5C504A] mt-1">Ph: 9187202605 / 9108253760</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-[#C05C3B]">INVOICE</h2>
              <p className="text-sm text-[#5C504A] mt-1">#{order.order_id}</p>
              <p className="text-xs text-[#8A7D76] mt-1">Date: {formatDate(order.order_date || order.created_at)}</p>
            </div>
          </div>

          {/* Customer & Order Info */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A7D76] mb-2">Customer</h3>
              <p className="font-semibold text-[#2D2420]">{order.customer_name}</p>
              <p className="text-sm text-[#5C504A]">Ph: {order.customer_phone}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A7D76] mb-2">Delivery</h3>
              <p className="font-semibold text-[#2D2420]">{formatDate(order.delivery_date)}</p>
              <p className="text-sm text-[#5C504A]">
                Status: <span className="capitalize">{order.status?.replace("_", " ")}</span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-[#2D2420] text-white">
                <th className="py-2 px-3 text-left font-medium">#</th>
                <th className="py-2 px-3 text-left font-medium">Service</th>
                <th className="py-2 px-3 text-left font-medium">Details</th>
                <th className="py-2 px-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, i) => (
                <tr key={i} className="border-b border-[#EFEBE4]">
                  <td className="py-3 px-3 text-[#5C504A]">{i + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-[#2D2420]">{item.service_type}</p>
                    {item.blouse_type && (
                      <p className="text-xs text-[#8A7D76]">{item.blouse_type === "with_cups" ? "With Cups" : "Without Cups"}</p>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {item.padded === "yes" && <span className="text-[10px] bg-[#F7F2EB] px-1.5 py-0.5 rounded">Padded</span>}
                      {item.princess_cut === "yes" && <span className="text-[10px] bg-[#F7F2EB] px-1.5 py-0.5 rounded">Princess Cut</span>}
                      {item.open_style && <span className="text-[10px] bg-[#F7F2EB] px-1.5 py-0.5 rounded">Open: {item.open_style}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-[#8A7D76]">
                    {item.front_neck_design && <span>FN: {item.front_neck_design} </span>}
                    {item.back_neck_design && <span>BN: {item.back_neck_design}</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-[#2D2420]">{formatCurrency(item.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Billing */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-1.5 text-sm text-[#5C504A]">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm text-[#5C504A]">
                <span>Tax ({order.tax_percentage}%)</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-bold text-[#2D2420] border-t-2 border-[#2D2420] mt-1">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {order.payments?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A7D76] mb-2">Payment History</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F2EB]">
                    <th className="py-1.5 px-3 text-left font-medium text-[#5C504A]">Date</th>
                    <th className="py-1.5 px-3 text-left font-medium text-[#5C504A]">Mode</th>
                    <th className="py-1.5 px-3 text-left font-medium text-[#5C504A]">Notes</th>
                    <th className="py-1.5 px-3 text-right font-medium text-[#5C504A]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((p, idx) => (
                    <tr key={idx} className="border-b border-[#EFEBE4]">
                      <td className="py-1.5 px-3">{p.date}</td>
                      <td className="py-1.5 px-3 capitalize">{p.mode?.replace("_", " ")}</td>
                      <td className="py-1.5 px-3 text-[#8A7D76]">{p.notes || "-"}</td>
                      <td className="py-1.5 px-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Balance */}
          <div className={`text-center py-3 rounded-lg ${order.balance > 0 ? "bg-[#C05C3B]/10" : "bg-[#7E8B76]/10"}`}>
            <span className={`text-sm font-bold ${order.balance > 0 ? "text-[#C05C3B]" : "text-[#7E8B76]"}`}>
              {order.balance > 0 ? `Balance Due: ${formatCurrency(order.balance)}` : "PAID IN FULL"}
            </span>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-[#EFEBE4] text-center">
            <p className="text-xs text-[#8A7D76]">Thank you for choosing Kshana Contour!</p>
            <p className="text-[10px] text-[#8A7D76] mt-1">
              Email: kshanaconture@gmail.com | Instagram: @kshana_contour
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Invoice;
