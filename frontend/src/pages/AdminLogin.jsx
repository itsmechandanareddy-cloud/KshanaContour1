import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/4m7v7k4y_image.png";

const AdminLogin = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    const result = await login(phone, password, true);
    setLoading(false);
    if (result.success) { toast.success("Welcome back!"); navigate("/admin"); }
    else { toast.error(result.error); }
  };

  return (
    <div className="min-h-screen flex bg-[#FDFBF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2D2420] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#FDFBF7]/40 hover:text-[#FDFBF7]/70 transition-colors w-fit text-xs uppercase tracking-[0.15em]">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />Back
          </button>
          <div>
            <h1 className="font-['Cormorant_Garamond'] text-5xl font-light text-[#FDFBF7] leading-tight">
              Admin<br />Portal
            </h1>
            <div className="w-12 h-px bg-[#D19B5A] mt-6 mb-6" />
            <p className="text-[#FDFBF7]/40 max-w-sm leading-relaxed">
              Manage your boutique, track orders, and grow your business.
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#FDFBF7]/20">Kshana Contour &copy; 2026</p>
        </div>
      </div>

      {/* Right */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#2D2420]">Sign In</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-[#2D2420]/40 mt-3">Admin Access</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.1em] text-[#2D2420]/50">Phone Number</Label>
              <Input type="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-12 px-0 focus:border-[#2D2420] focus:ring-0 transition-colors"
                data-testid="admin-phone-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.1em] text-[#2D2420]/50">Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-12 px-0 pr-10 focus:border-[#2D2420] focus:ring-0 transition-colors"
                  data-testid="admin-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#2D2420]/30 hover:text-[#2D2420]/60">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none h-12 text-xs uppercase tracking-[0.15em] mt-8 transition-all"
              data-testid="admin-login-button">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <a href="/login" className="text-xs uppercase tracking-[0.1em] text-[#D19B5A] hover:text-[#2D2420] transition-colors">Customer Login</a>
          </div>
        </div>
      </div>

      <button onClick={() => navigate("/")} className="lg:hidden fixed top-4 left-4 p-2 bg-white border border-[#2D2420]/10">
        <ArrowLeft className="w-4 h-4 text-[#2D2420]" />
      </button>
    </div>
  );
};

export default AdminLogin;
