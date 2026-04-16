import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../../App";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { 
  ShoppingBag, MessageCircle, Instagram, MapPin, Phone, 
  Mail, Star, LogOut, ArrowRight
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/4m7v7k4y_image.png";

const CustomerHome = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [gallery, setGallery] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    axios.get(`${API}/gallery`).then(r => {
      const items = r.data.map(g => ({
        id: g.id,
        image_url: g.file_id ? `${API}/gallery/image/${g.file_id}` : g.image_url,
        title: g.title
      }));
      setGallery(items);
    }).catch(() => {});
  }, []);

  // Auto-slide every 15 seconds
  useEffect(() => {
    if (gallery.length <= 3) return;
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % gallery.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  const getVisibleGallery = () => {
    if (gallery.length === 0) return [];
    if (gallery.length <= 3) return gallery;
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(gallery[(slideIndex + i) % gallery.length]);
    }
    return visible;
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen bg-[#FDFBF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#2D2420]/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Kshana" className="w-10 h-10 object-contain" />
            <span className="font-['Cormorant_Garamond'] text-lg font-light text-[#2D2420] tracking-wide">Kshana Contour</span>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="text-[#2D2420]/40 hover:text-[#2D2420] rounded-none text-xs uppercase tracking-[0.1em]" data-testid="customer-logout">
            <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Welcome */}
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-3">Welcome back</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#2D2420]">
            {user?.name || "Customer"}
          </h1>
          <div className="w-12 h-px bg-[#D19B5A] mt-6" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => navigate("/customer/orders")}
            className="flex items-center justify-between p-8 bg-[#2D2420] text-[#FDFBF7] hover:bg-[#3D3430] transition-all duration-300 group"
            data-testid="view-orders-btn">
            <div className="flex items-center gap-4">
              <ShoppingBag className="w-6 h-6 text-[#D19B5A]" strokeWidth={1.5} />
              <div className="text-left">
                <p className="text-sm font-light">My Orders</p>
                <p className="text-xs text-[#FDFBF7]/40 mt-1">Track your order status</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#FDFBF7]/30 group-hover:text-[#FDFBF7]/70 group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
          </button>
          <a href="https://wa.me/919187202605" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-8 border border-[#2D2420]/10 hover:border-[#2D2420]/30 transition-all duration-300 group"
            data-testid="whatsapp-link">
            <div className="flex items-center gap-4">
              <MessageCircle className="w-6 h-6 text-[#25D366]" strokeWidth={1.5} />
              <div className="text-left">
                <p className="text-sm text-[#2D2420] font-light">WhatsApp Us</p>
                <p className="text-xs text-[#2D2420]/40 mt-1">Chat with us directly</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#2D2420]/20 group-hover:text-[#2D2420]/50 group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
          </a>
        </div>

        {/* Gallery — Rolling Carousel */}
        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-4">Our Work</p>
              <h2 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#2D2420]">Gallery</h2>
            </div>
            {gallery.length > 3 && (
              <div className="flex gap-2">
                <button onClick={() => setSlideIndex(prev => (prev - 1 + gallery.length) % gallery.length)}
                  className="w-9 h-9 border border-[#2D2420]/15 flex items-center justify-center hover:border-[#2D2420] transition-colors">
                  <ArrowRight className="w-4 h-4 rotate-180 text-[#2D2420]" />
                </button>
                <button onClick={() => setSlideIndex(prev => (prev + 1) % gallery.length)}
                  className="w-9 h-9 border border-[#2D2420]/15 flex items-center justify-center hover:border-[#2D2420] transition-colors">
                  <ArrowRight className="w-4 h-4 text-[#2D2420]" />
                </button>
              </div>
            )}
          </div>
          {gallery.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {getVisibleGallery().map((item, idx) => (
                  <div key={`${item.id}-${slideIndex}-${idx}`} className="group relative aspect-[3/4] overflow-hidden animate-fade-in">
                    <img src={item.image_url} alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[#2D2420]/0 group-hover:bg-[#2D2420]/40 transition-all duration-500 flex items-end">
                      <div className="p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <p className="text-[#FDFBF7] text-sm font-light tracking-wide">{item.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {gallery.length > 3 && (
                <div className="flex justify-center gap-1.5 mt-6">
                  {gallery.map((_, i) => (
                    <button key={i} onClick={() => setSlideIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === slideIndex ? "bg-[#D19B5A] w-6" : "bg-[#2D2420]/15"}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#8A7D76] text-sm">Gallery coming soon</p>
            </div>
          )}
        </div>

        {/* Contact & Links */}
        <div className="border-t border-[#2D2420]/10 pt-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-8">Get in Touch</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { href: "tel:+919187202605", icon: Phone, label: "Call", detail: "9187202605" },
              { href: "mailto:kshanaconture@gmail.com", icon: Mail, label: "Email", detail: "kshanaconture@gmail.com" },
              { href: "https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8", icon: MapPin, label: "Visit", detail: "Google Maps" },
              { href: "https://www.instagram.com/kshana_contour?igsh=ZWl5eDBuemxrZnVm", icon: Instagram, label: "Follow", detail: "@kshana_contour" },
            ].map(({ href, icon: Icon, label, detail }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="text-center group">
                <Icon className="w-5 h-5 text-[#2D2420]/30 mx-auto mb-3 group-hover:text-[#D19B5A] transition-colors" strokeWidth={1.5} />
                <p className="text-xs uppercase tracking-[0.15em] text-[#2D2420]/40 mb-1">{label}</p>
                <p className="text-sm text-[#2D2420] font-light truncate">{detail}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="text-center py-8">
          <button onClick={() => window.open("https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8", "_blank")} className="inline-flex flex-col items-center gap-3 group">
            <div className="flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-[#D19B5A] fill-[#D19B5A]" />)}</div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#2D2420]/40 group-hover:text-[#D19B5A] transition-colors">View Google Reviews</p>
          </button>
        </div>
      </div>

      {/* WhatsApp Float */}
      <a href="https://wa.me/919187202605" target="_blank" rel="noopener noreferrer" className="whatsapp-float" data-testid="whatsapp-float">
        <MessageCircle className="w-7 h-7" />
      </a>
    </div>
  );
};

export default CustomerHome;
