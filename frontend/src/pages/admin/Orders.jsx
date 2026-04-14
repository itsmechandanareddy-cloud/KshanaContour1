import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { 
  Plus, Search, Eye, Edit, Phone, Calendar, 
  IndianRupee, Clock, CheckCircle, Truck, AlertTriangle, Printer, MessageCircle, Trash2
} from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  pending: "badge-pending",
  in_progress: "badge-in-progress",
  ready: "badge-ready",
  delivered: "badge-delivered"
};

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered"
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, search, statusFilter]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_id?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        order.customer_phone?.includes(search)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/orders/${orderId}/status?status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Order status updated to ${statusLabels[newStatus]}`);
      fetchOrders();
      
      // Open WhatsApp with status message
      try {
        const waResp = await axios.get(`${API}/orders/${orderId}/whatsapp-message?message_type=status_update`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (waResp.data?.whatsapp_url) {
          window.open(waResp.data.whatsapp_url, "_blank");
        }
      } catch (e) {
        // WhatsApp is optional, don't block
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const sendWhatsApp = async (orderId, messageType = "status_update") => {
    try {
      const token = localStorage.getItem("token");
      const resp = await axios.get(`${API}/orders/${orderId}/whatsapp-message?message_type=${messageType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.data?.whatsapp_url) {
        window.open(resp.data.whatsapp_url, "_blank");
      }
    } catch (error) {
      toast.error("Failed to generate WhatsApp message");
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteReason.trim()) { toast.error("Please enter a reason"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/orders/${deleteOrderId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { reason: deleteReason }
      });
      toast.success("Order deleted");
      setShowDeleteModal(false);
      setDeleteOrderId(null);
      setDeleteReason("");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to delete order");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysUntilDelivery = (deliveryDate) => {
    if (!deliveryDate) return null;
    const today = new Date();
    const delivery = new Date(deliveryDate);
    const diff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    return diff;
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
      <div className="space-y-6 animate-fade-in" data-testid="admin-orders">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">
            Orders
          </h1>
          <Button
            onClick={() => navigate("/admin/orders/new")}
            className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6 shadow-[0_4px_12px_rgba(192,92,59,0.25)]"
            data-testid="new-order-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8A7D76]" />
            <Input
              placeholder="Search by Order ID, Name, or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-white border-[#EFEBE4] rounded-xl h-12"
              data-testid="search-orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white border-[#EFEBE4] rounded-xl h-12" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-12 text-center">
              <p className="text-[#8A7D76]">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const daysUntil = getDaysUntilDelivery(order.delivery_date);
              const isUrgent = daysUntil !== null && daysUntil <= 2 && order.status !== "delivered";
              
              return (
                <Card 
                  key={order.order_id} 
                  className={`bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)] card-hover ${isUrgent ? 'border-l-4 border-l-[#B85450]' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-[#2D2420] text-lg">
                            #{order.order_id}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                            {statusLabels[order.status]}
                          </span>
                          {isUrgent && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium badge-warning flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Due in {daysUntil} day(s)
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-[#2D2420]">{order.customer_name}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[#8A7D76]">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {order.customer_phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Delivery: {formatDate(order.delivery_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            Total: {formatCurrency(order.total)}
                          </span>
                          {order.balance > 0 && (
                            <span className="text-[#B85450] font-medium">
                              Balance: {formatCurrency(order.balance)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/orders/${order.order_id}`)}
                          className="border-[#EFEBE4] hover:border-[#C05C3B] hover:text-[#C05C3B] rounded-lg"
                          data-testid={`view-order-${order.order_id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/invoice/${order.order_id}`)}
                          className="border-[#EFEBE4] hover:border-[#7E8B76] hover:text-[#7E8B76] rounded-lg"
                          data-testid={`print-order-${order.order_id}`}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendWhatsApp(order.order_id)}
                          className="border-[#EFEBE4] hover:border-[#25D366] hover:text-[#25D366] rounded-lg"
                          data-testid={`whatsapp-order-${order.order_id}`}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setDeleteOrderId(order.order_id); setShowDeleteModal(true); }}
                          className="border-[#EFEBE4] hover:border-[#B85450] hover:text-[#B85450] rounded-lg"
                          data-testid={`delete-order-${order.order_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {order.status !== "delivered" && (
                          <Select 
                            value={order.status} 
                            onValueChange={(value) => updateOrderStatus(order.order_id, value)}
                          >
                            <SelectTrigger className="w-36 border-[#EFEBE4] rounded-lg" data-testid={`update-status-${order.order_id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Order Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#B85450]">
              Delete Order #{deleteOrderId}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-[#5C504A]">This will permanently remove this order. Please provide a reason.</p>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Reason for Deletion *</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="bg-[#F7F2EB] border-transparent focus:border-[#B85450] rounded-xl"
                rows={3}
                placeholder="e.g., Customer cancelled, Duplicate order..."
                data-testid="delete-reason-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteReason(""); }} className="rounded-full">Cancel</Button>
            <Button onClick={handleDeleteOrder} className="bg-[#B85450] hover:bg-[#9A4440] text-white rounded-full" data-testid="confirm-delete-btn">
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Orders;
