import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

const Gallery = () => {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchGallery(); }, []);

  const fetchGallery = async () => {
    try {
      const response = await axios.get(`${API}/gallery`);
      setGallery(response.data);
    } catch (error) {
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title first");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newTitle.trim()) { toast.error("Please enter a title first"); return; }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: Get Cloudinary upload config (small JSON request - fast)
      const configRes = await axios.get(`${API}/gallery/cloudinary-config`, { headers });
      const { cloud_name, api_key, signature, timestamp, folder } = configRes.data;

      // Step 2: Upload directly to Cloudinary (bypasses Render completely)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", api_key);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);

      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        formData
      );

      // Step 3: Save the URL to our database (small JSON request - fast)
      await axios.post(`${API}/gallery/save`, {
        image_url: uploadRes.data.secure_url,
        public_id: uploadRes.data.public_id,
        title: newTitle,
        category: newCategory
      }, { headers });

      toast.success("Image uploaded to gallery");
      setShowAddModal(false);
      setNewTitle("");
      setNewCategory("");
      fetchGallery();
    } catch (error) {
      console.error("Upload error:", error);
      const msg = error.response?.data?.detail || error.response?.data?.error?.message || error.message || "Failed to upload image";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/gallery/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Image deleted");
      setDeleteConfirm(null);
      fetchGallery();
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const getImageSrc = (item) => {
    if (item.file_id) return `${API}/gallery/image/${item.file_id}`;
    return item.image_url;
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
      <div className="space-y-6 animate-fade-in" data-testid="admin-gallery">
        <div className="flex items-center justify-between">
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Gallery</h1>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6" data-testid="add-gallery-button">
            <Plus className="w-4 h-4 mr-2" />Upload Image
          </Button>
        </div>

        {gallery.length === 0 ? (
          <Card className="bg-white border-[#EFEBE4]">
            <CardContent className="p-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-[#8A7D76] mb-4" />
              <p className="text-[#8A7D76]">No gallery images yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {gallery.map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#F7F2EB]">
                <img src={getImageSrc(item)} alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23F7F2EB" width="400" height="400"/><text x="50%" y="50%" text-anchor="middle" fill="%238A7D76" font-size="14">Image</text></svg>'; }}
                />
                {/* Delete button - large touch target for mobile */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(item); }}
                  className="absolute top-2 right-2 bg-[#2D2420]/70 hover:bg-[#B85450] active:bg-[#B85450] rounded-full w-10 h-10 flex items-center justify-center z-20 touch-manipulation"
                  data-testid={`delete-gallery-${item.id}`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-medium truncate">{item.title}</p>
                    {item.category && <p className="text-white/70 text-sm">{item.category}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog (replaces window.confirm for mobile) */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#B85450]">Delete Image</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#5C504A] py-2">
            Are you sure you want to delete <strong>{deleteConfirm?.title}</strong> from the gallery?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-full flex-1">Cancel</Button>
            <Button onClick={() => handleDeleteItem(deleteConfirm?.id)} className="bg-[#B85450] hover:bg-[#9A4440] text-white rounded-full flex-1" data-testid="confirm-gallery-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">Upload Gallery Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Title *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-[#F7F2EB] border-transparent rounded-xl" placeholder="e.g., Bridal Collection" data-testid="gallery-title-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Category</Label>
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="bg-[#F7F2EB] border-transparent rounded-xl" placeholder="e.g., Blouses, Sarees" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#5C504A]">Image File *</Label>
              {/* Hidden file input with ref */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUploadImage}
                disabled={uploading}
                accept="image/*"
                data-testid="gallery-file-input"
              />
              {/* Explicit button to trigger file picker */}
              <Button
                type="button"
                variant="outline"
                onClick={handleFileSelect}
                disabled={uploading}
                className="w-full h-24 border-2 border-dashed border-[#C05C3B]/30 rounded-xl hover:bg-[#C05C3B]/5 flex flex-col items-center justify-center gap-2"
                data-testid="gallery-upload-trigger"
              >
                <Upload className="w-6 h-6 text-[#C05C3B]" />
                <span className="text-sm text-[#5C504A]">{uploading ? "Uploading..." : "Tap to select image"}</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Gallery;
