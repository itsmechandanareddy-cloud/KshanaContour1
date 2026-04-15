import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import {
  Star, Phone, Mail, MapPin, Instagram, MessageCircle,
  ExternalLink, Copy, Plus, Trash2, Edit, BarChart3
} from "lucide-react";
import { toast } from "sonner";

const CONTACT_INFO = {
  email: "kshanaconture@gmail.com",
  phone1: "9187202605",
  phone2: "9108253760",
  whatsapp: "9187202605",
  googleMaps: "https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8",
  instagram: "https://www.instagram.com/kshana_contour?igsh=ZWl5eDBuemxrZnVm",
  googleReviews: "https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8"
};

const ReviewsContact = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [newReview, setNewReview] = useState({ reviewer_name: "", rating: 5, review_text: "", date: "", source: "google" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };
      const [revRes, statsRes] = await Promise.all([
        axios.get(`${API}/reviews`, { headers: h }),
        axios.get(`${API}/reviews/stats`, { headers: h })
      ]);
      setReviews(revRes.data);
      setStats(statsRes.data);
    } catch { toast.error("Failed to load reviews"); }
    finally { setLoading(false); }
  };

  const handleSaveReview = async () => {
    if (!newReview.reviewer_name || !newReview.review_text) { toast.error("Name and review text required"); return; }
    try {
      const token = localStorage.getItem("token");
      const h = { Authorization: `Bearer ${token}` };
      if (editingReview) {
        await axios.put(`${API}/reviews/${editingReview.id}`, newReview, { headers: h });
        toast.success("Review updated");
      } else {
        await axios.post(`${API}/reviews`, newReview, { headers: h });
        toast.success("Review added");
      }
      setShowAddModal(false);
      setEditingReview(null);
      setNewReview({ reviewer_name: "", rating: 5, review_text: "", date: "", source: "google" });
      fetchData();
    } catch { toast.error("Failed to save review"); }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/reviews/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Review deleted");
      fetchData();
    } catch { toast.error("Failed to delete"); }
  };

  const openEdit = (rev) => {
    setNewReview({ reviewer_name: rev.reviewer_name, rating: rev.rating, review_text: rev.review_text, date: rev.date || "", source: rev.source || "google" });
    setEditingReview(rev);
    setShowAddModal(true);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in" data-testid="admin-reviews">
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Reviews & Contact</h1>
          <div className="flex gap-2">
            <Button onClick={() => window.open(CONTACT_INFO.googleReviews, "_blank")}
              variant="outline" className="border-[#EFEBE4] rounded-full text-xs uppercase tracking-[0.1em]" data-testid="view-google-reviews">
              <ExternalLink className="w-4 h-4 mr-2" />Google Reviews
            </Button>
            <Button onClick={() => { setEditingReview(null); setNewReview({ reviewer_name: "", rating: 5, review_text: "", date: "", source: "google" }); setShowAddModal(true); }}
              className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6" data-testid="add-review-btn">
              <Plus className="w-4 h-4 mr-2" />Add Review
            </Button>
          </div>
        </div>

        {/* Review Stats + Graph */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Average & Total */}
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A7D76]">Average Rating</p>
              <p className="font-['Cormorant_Garamond'] text-6xl font-light text-[#2D2420]">{stats.average || "—"}</p>
              <div className="flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(stats.average) ? "text-[#D19B5A] fill-[#D19B5A]" : "text-[#EFEBE4]"}`} />
                ))}
              </div>
              <p className="text-sm text-[#8A7D76]">{stats.total} total review{stats.total !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          {/* Rating Distribution Graph */}
          <Card className="bg-white border-[#EFEBE4] lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D19B5A]" />Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="rating-distribution">
              {[5, 4, 3, 2, 1].map(star => {
                const count = stats.distribution[star] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16 justify-end">
                      <span className="text-sm font-medium text-[#2D2420]">{star}</span>
                      <Star className="w-4 h-4 text-[#D19B5A] fill-[#D19B5A]" />
                    </div>
                    <div className="flex-1 h-6 bg-[#F7F2EB] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: star >= 4 ? "#D19B5A" : star === 3 ? "#C05C3B" : "#B85450",
                          minWidth: count > 0 ? "8px" : "0px"
                        }}
                      />
                    </div>
                    <span className="text-sm text-[#8A7D76] w-12 text-right">{count} ({Math.round(pct)}%)</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Customer Reviews ({reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-center text-[#8A7D76] py-8">No reviews yet. Add reviews from your Google Business page.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(rev => (
                  <div key={rev.id} className="flex gap-4 p-4 bg-[#F7F2EB] rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-[#2D2420]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#2D2420]">{rev.reviewer_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#2D2420]">{rev.reviewer_name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? "text-[#D19B5A] fill-[#D19B5A]" : "text-[#EFEBE4]"}`} />
                          ))}
                        </div>
                        {rev.source && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white rounded-full text-[#8A7D76]">{rev.source}</span>}
                        {rev.date && <span className="text-xs text-[#8A7D76]">{rev.date}</span>}
                      </div>
                      <p className="text-sm text-[#5C504A] leading-relaxed">{rev.review_text}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rev)} className="text-[#5C504A] hover:text-[#C05C3B]">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteReview(rev.id)} className="text-[#B85450] hover:bg-[#B85450]/10" data-testid={`delete-review-${rev.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Contact & Social</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-[#F7F2EB] rounded-xl">
                <Phone className="w-5 h-5 text-[#C05C3B]" />
                <div className="flex-1">
                  <p className="text-xs text-[#8A7D76]">Phone</p>
                  <p className="text-sm text-[#2D2420]">{CONTACT_INFO.phone1}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(CONTACT_INFO.phone1, "Phone")} className="w-8 h-8"><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#F7F2EB] rounded-xl">
                <Mail className="w-5 h-5 text-[#C05C3B]" />
                <div className="flex-1">
                  <p className="text-xs text-[#8A7D76]">Email</p>
                  <p className="text-sm text-[#2D2420] truncate">{CONTACT_INFO.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(CONTACT_INFO.email, "Email")} className="w-8 h-8"><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <button onClick={() => window.open(`https://wa.me/91${CONTACT_INFO.whatsapp}`, "_blank")} className="flex items-center gap-3 p-4 bg-[#25D366]/10 rounded-xl hover:bg-[#25D366]/20 transition-colors text-left">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                <div>
                  <p className="text-xs text-[#8A7D76]">WhatsApp</p>
                  <p className="text-sm text-[#2D2420]">+91 {CONTACT_INFO.whatsapp}</p>
                </div>
              </button>
              <button onClick={() => window.open(CONTACT_INFO.instagram, "_blank")} className="flex items-center gap-3 p-4 bg-purple-500/5 rounded-xl hover:bg-purple-500/10 transition-colors text-left">
                <Instagram className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs text-[#8A7D76]">Instagram</p>
                  <p className="text-sm text-[#2D2420]">@kshana_contour</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Review Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#2D2420]/10 max-w-lg rounded-none" style={{ fontFamily: "'Manrope', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-2xl text-[#2D2420] font-light">{editingReview ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Reviewer Name *</Label>
                <Input value={newReview.reviewer_name} onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 px-0 focus:border-[#2D2420] focus:ring-0" placeholder="Customer name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Date</Label>
                <Input type="date" value={newReview.date} onChange={(e) => setNewReview({ ...newReview, date: e.target.value })}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-10 px-0 focus:border-[#2D2420] focus:ring-0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Rating</Label>
                <div className="flex gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setNewReview({ ...newReview, rating: s })}
                      className="p-0.5 transition-transform hover:scale-110">
                      <Star className={`w-7 h-7 ${s <= newReview.rating ? "text-[#D19B5A] fill-[#D19B5A]" : "text-[#EFEBE4]"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Source</Label>
                <select value={newReview.source} onChange={(e) => setNewReview({ ...newReview, source: e.target.value })}
                  className="h-10 w-full border-b border-[#2D2420]/15 bg-transparent text-sm focus:outline-none focus:border-[#2D2420]">
                  <option value="google">Google</option>
                  <option value="instagram">Instagram</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Review Text *</Label>
              <Textarea value={newReview.review_text} onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                className="bg-transparent border border-[#2D2420]/15 rounded-none focus:border-[#2D2420] focus:ring-0" rows={4} placeholder="What did the customer say..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-none border-[#2D2420]/15 text-xs uppercase tracking-[0.1em]">Cancel</Button>
            <Button onClick={handleSaveReview} className="bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none text-xs uppercase tracking-[0.1em]">{editingReview ? "Update" : "Add Review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ReviewsContact;
