import { useState } from "react";
import axios from "axios";
import { API } from "../../App";
import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { KeyRound, Phone, Eye, EyeOff, Shield, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const h = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const sendCode = async () => {
    if (!currentPassword) { toast.error("Enter current password first"); return; }
    if (!newPhone && !newPassword) { toast.error("Enter new phone or password to change"); return; }
    if (newPassword && newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword && newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setSending(true);
    try {
      await axios.post(`${API}/auth/admin/send-verification-code`, { current_password: currentPassword }, { headers: h() });
      setCodeSent(true);
      toast.success("Verification code sent to Kshana email!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send code");
    } finally { setSending(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!verificationCode) { toast.error("Enter the verification code from email"); return; }

    setSaving(true);
    try {
      const payload = { current_password: currentPassword, verification_code: verificationCode };
      if (newPhone) payload.new_phone = newPhone;
      if (newPassword) payload.new_password = newPassword;

      await axios.put(`${API}/auth/admin/update-credentials`, payload, { headers: h() });
      toast.success("Credentials updated! Please login again.");
      setCurrentPassword(""); setNewPhone(""); setNewPassword("");
      setConfirmPassword(""); setVerificationCode(""); setCodeSent(false);
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
            <p className="text-xs text-[#8A7D76] mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Verification code will be sent to kshanaconture@gmail.com
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Current Password *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D76]" />
                  <Input type={showCurrent ? "text" : "password"} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)} disabled={codeSent}
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
                    <Input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} disabled={codeSent}
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
                      onChange={(e) => setNewPassword(e.target.value)} disabled={codeSent}
                      className="pl-10 pr-10 bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                      placeholder="Leave empty to keep current" data-testid="new-password" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7D76]">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                {newPassword && !codeSent && (
                  <div className="space-y-2 mb-5">
                    <Label className="text-[10px] uppercase tracking-[0.15em] text-[#2D2420]/50">Confirm New Password</Label>
                    <Input type="password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-11 focus:border-[#2D2420] focus:ring-0"
                      placeholder="Re-enter new password" data-testid="confirm-password" />
                  </div>
                )}
              </div>

              {/* Step 1: Send Code */}
              {!codeSent && (
                <Button type="button" onClick={sendCode} disabled={sending}
                  className="w-full bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none h-11 text-xs uppercase tracking-[0.15em]"
                  data-testid="send-code-btn">
                  <Mail className="w-4 h-4 mr-2" />
                  {sending ? "Sending Code..." : "Send Verification Code"}
                </Button>
              )}

              {/* Step 2: Enter Code & Update */}
              {codeSent && (
                <div className="space-y-4 border-t border-[#D19B5A]/30 pt-6">
                  <div className="bg-[#7E8B76]/10 p-3 rounded-sm">
                    <p className="text-xs text-[#7E8B76] flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      Code sent to kshanaconture@gmail.com — check your inbox
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.15em] text-[#D19B5A]">Verification Code *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D19B5A]" />
                      <Input type="text" value={verificationCode} maxLength={6}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="pl-10 bg-transparent border-b-2 border-[#D19B5A]/40 rounded-none h-12 text-2xl tracking-[8px] text-center focus:border-[#D19B5A] focus:ring-0"
                        placeholder="000000" data-testid="verification-code" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => { setCodeSent(false); setVerificationCode(""); }}
                      className="flex-1 border-[#EFEBE4] rounded-none h-11 text-xs uppercase tracking-[0.15em]">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving || verificationCode.length !== 6}
                      className="flex-1 bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-none h-11 text-xs uppercase tracking-[0.15em]"
                      data-testid="update-credentials-btn">
                      {saving ? "Updating..." : "Verify & Update"}
                    </Button>
                  </div>
                  <button type="button" onClick={sendCode} className="text-xs text-[#8A7D76] hover:text-[#C05C3B] underline w-full text-center">
                    Resend code
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
