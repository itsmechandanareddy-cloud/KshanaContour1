import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../../App";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { 
  ShoppingBag, MessageCircle, Instagram, MapPin, Phone, 
  Mail, Star, LogOut, ChevronRight, Scissors
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/wev163i5_image.png";

const CustomerHome = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [gallery, setGallery] = useState([]);

  const defaultGallery = [
    { id: 1, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/7lsyatwt_image.png", title: "Red Bridal Blouse" },
    { id: 2, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/wo33jc1d_WhatsApp%20Image%202026-04-14%20at%2012.30.24%20PM.jpeg", title: "Traditional Zari Work" },
    { id: 3, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/3u4ltgp8_WhatsApp%20Image%202026-04-14%20at%2012.30.20%20PM%20%281%29.jpeg", title: "Floral Embroidery" },
    { id: 4, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/6oa9xqr3_WhatsApp%20Image%202026-04-14%20at%2012.30.19%20PM.jpeg", title: "Purple Velvet Designer" },
  ];

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const response = await axios.get(`${API}/gallery`);
      setGallery(response.data.length > 0 ? response.data : defaultGallery);
    } catch {
      setGallery(defaultGallery);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-[#EFEBE4] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6 text-[#C05C3B]" />
            <span className="font-['Cormorant_Garamond'] text-xl font-semibold text-[#2D2420]">
              Kshana Contour
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/customer/orders")}
              className="border-[#EFEBE4] rounded-full"
              data-testid="my-orders-button"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              My Orders
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-[#8A7D76] hover:text-[#B85450]"
              data-testid="customer-logout-button"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <img src={LOGO_URL} alt="Kshana Contour" className="h-32 w-auto mx-auto mb-6" />
          <h1 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#2D2420] mb-4">
            Welcome, {user?.name || "Valued Customer"}!
          </h1>
          <p className="text-lg tracking-[0.2em] text-[#8C3B24] font-medium mb-4">
            CLASSY. AESTHETIC. ELEGANT
          </p>
          <p className="text-[#5C504A] max-w-2xl mx-auto">
            Thank you for choosing Kshana Contour. We're honored to craft your special garments 
            with the utmost care and precision.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)] cursor-pointer card-hover"
              onClick={() => navigate("/customer/orders")}
            >
              <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#C05C3B]/10 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-[#C05C3B]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2D2420]">
                    View My Orders
                  </h3>
                  <p className="text-[#8A7D76]">Track your orders, measurements & payments</p>
                </div>
                <ChevronRight className="w-6 h-6 text-[#8A7D76]" />
              </CardContent>
            </Card>

            <a 
              href="https://wa.me/919187202605"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)] cursor-pointer card-hover h-full">
                <CardContent className="p-8 flex items-center gap-6 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-[#25D366]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2D2420]">
                      Chat with Us
                    </h3>
                    <p className="text-[#8A7D76]">Contact us on WhatsApp for queries</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-[#8A7D76]" />
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-12 px-6 bg-[#F7F2EB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C3B24] mb-3">
              Our Work
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-4xl text-[#2D2420] font-medium">
              Gallery
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.slice(0, 4).map((item) => (
              <div 
                key={item.id}
                className="aspect-square overflow-hidden rounded-2xl"
              >
                <img 
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <a 
            href="https://maps.app.goo.gl/c7z46uTDaKbCNvNr9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 bg-white border border-[#EFEBE4] rounded-2xl px-8 py-6 shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)] hover:shadow-[0_8px_32px_-8px_rgba(139,102,85,0.15)] transition-all"
          >
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <span className="text-[#2D2420] font-medium">View our Google Reviews</span>
          </a>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 px-6 bg-[#2D2420] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-medium">
              Get in Touch
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <a 
              href="tel:+919187202605"
              className="flex flex-col items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Phone className="w-8 h-8 text-[#D19B5A] mb-3" />
              <p className="text-white/70">9187202605</p>
              <p className="text-white/70">9108253760</p>
            </a>
            <a 
              href="mailto:kshanaconture@gmail.com"
              className="flex flex-col items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Mail className="w-8 h-8 text-[#D19B5A] mb-3" />
              <p className="text-white/70">kshanaconture@gmail.com</p>
            </a>
            <a 
              href="https://maps.app.goo.gl/c7z46uTDaKbCNvNr9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <MapPin className="w-8 h-8 text-[#D19B5A] mb-3" />
              <p className="text-white/70">View on Google Maps</p>
            </a>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <a 
              href="https://wa.me/919187202605"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
            <a 
              href="https://www.instagram.com/kshana_contour"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>
          </div>
        </div>
      </section>

      {/* WhatsApp Float */}
      <a
        href="https://wa.me/919187202605"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
      >
        <MessageCircle className="w-7 h-7" />
      </a>
    </div>
  );
};

export default CustomerHome;
