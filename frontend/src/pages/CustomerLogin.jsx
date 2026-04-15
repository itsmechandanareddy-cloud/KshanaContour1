import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SKETCH_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/a4jq30f0_image.png";

const CustomerLogin = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    const result = await login(name, password, false);
    setLoading(false);
    if (result.success) { toast.success("Welcome!"); navigate("/customer"); }
    else { toast.error(result.error); }
  };

  return (
    <div className="min-h-screen flex bg-[#FDFBF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F7F2EB] relative items-center justify-center overflow-hidden">
        <div className="absolute top-8 left-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#2D2420]/40 hover:text-[#2D2420]/70 transition-colors text-xs uppercase tracking-[0.15em]">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />Back
          </button>
        </div>
        <div className="relative">
          <div className="absolute top-4 right-4 w-[90%] h-[90%] border border-[#D19B5A]/20" />
          <img src={SKETCH_URL} alt="Fashion" className="relative w-80 object-contain" />
        </div>
        <div className="absolute bottom-12 left-12">
          <p className="font-['Cormorant_Garamond'] text-4xl font-light text-[#2D2420]">Welcome</p>
          <div className="w-12 h-px bg-[#D19B5A] mt-4" />
        </div>
      </div>

      {/* Right */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#2D2420]">Customer Portal</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-[#2D2420]/40 mt-3">Track Your Orders</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.1em] text-[#2D2420]/50">Name</Label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-12 px-0 focus:border-[#2D2420] focus:ring-0"
                data-testid="customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.1em] text-[#2D2420]/50">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent border-b border-[#2D2420]/15 rounded-none h-12 px-0 pr-10 focus:border-[#2D2420] focus:ring-0"
                  data-testid="customer-password-input"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#8A7D76]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#8A7D76] mt-1">Default password is your phone number</p>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none h-12 text-xs uppercase tracking-[0.15em] mt-8"
              data-testid="customer-login-button">
              {loading ? "Signing in..." : "View My Orders"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <a href="/admin/login" className="text-xs uppercase tracking-[0.1em] text-[#D19B5A] hover:text-[#2D2420] transition-colors">Admin Login</a>
          </div>
        </div>
      </div>

      <button onClick={() => navigate("/")} className="lg:hidden fixed top-4 left-4 p-2 bg-white border border-[#2D2420]/10">
        <ArrowLeft className="w-4 h-4 text-[#2D2420]" />
      </button>
    </div>
  );
};

export default CustomerLogin;
