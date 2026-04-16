import { useState } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { KeyRound, Phone, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword) { toast.error("Enter current password"); return; }
    if (!newPhone && !newPassword) { toast.error("Enter new phone or new password"); return; }
    if (newPassword && newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword && newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { current_password: currentPassword };
      if (newPhone) payload.new_phone = newPhone;
      if (newPassword) payload.new_password = newPassword;

      await axios.put(`${API}/auth/admin/update-credentials`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Credentials updated! Please login again with new credentials.");
      setCurrentPassword("");
      setNewPhone("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-xl" data-testid="admin-settings">
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">Settings</h1>

        <Card className="bg-white border-[#EFEBE4]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D19B5A]" />Admin Login Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Current Password *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D76]" />
                  <Input type={showCurrent ? "text" : "password"} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10 bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                    placeholder="Enter current password" data-testid="current-password" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7D76]">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-[#EFEBE4] pt-6">
                <p className="text-xs text-[#8A7D76] mb-4">Change one or both fields below:</p>

                {/* New Phone */}
                <div className="space-y-2 mb-5">
                  <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">New Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D76]" />
                    <Input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                      className="pl-10 bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                      placeholder="Leave empty to keep current" data-testid="new-phone" />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2 mb-5">
                  <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">New Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D76]" />
                    <Input type={showNew ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                      placeholder="Leave empty to keep current" data-testid="new-password" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7D76]">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                {newPassword && (
                  <div className="space-y-2 mb-5">
                    <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Confirm New Password</Label>
                    <Input type="password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                      placeholder="Re-enter new password" data-testid="confirm-password" />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving}
                className="w-full bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none h-11 text-xs uppercase tracking-[0.15em]"
                data-testid="update-credentials-btn">
                {saving ? "Updating..." : "Update Credentials"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
