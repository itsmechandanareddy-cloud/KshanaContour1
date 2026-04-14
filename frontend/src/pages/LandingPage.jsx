import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Phone, Mail, MapPin, Instagram, MessageCircle, 
  User, ShieldCheck, ChevronDown, Star, Scissors
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/wev163i5_image.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  // Gallery images from Kshana Contour boutique
  const defaultGallery = [
    { id: 1, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/7lsyatwt_image.png", title: "Red Bridal Blouse" },
    { id: 2, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/wo33jc1d_WhatsApp%20Image%202026-04-14%20at%2012.30.24%20PM.jpeg", title: "Traditional Zari Work" },
    { id: 3, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/3u4ltgp8_WhatsApp%20Image%202026-04-14%20at%2012.30.20%20PM%20%281%29.jpeg", title: "Floral Embroidery" },
    { id: 4, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/l27qx3pj_WhatsApp%20Image%202026-04-14%20at%2012.30.20%20PM.jpeg", title: "Red Silk Blouse" },
    { id: 5, image_url: "https://customer-assets.emergentagent.com/job_kshana-contour/artifacts/6oa9xqr3_WhatsApp%20Image%202026-04-14%20at%2012.30.19%20PM.jpeg", title: "Purple Velvet Designer" },
    { id: 6, image_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400", title: "Hand Embroidery Work" },
  ];

  const services = [
    "Bridal Blouses", "Traditional Blouses", "Contemporary Blouses",
    "Hand Work", "Machine Work", "Saree Lace & Kuchu",
    "Men's Wear", "Kids Wear", "Custom Alterations"
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/95 backdrop-blur-md z-50 border-b border-[#EFEBE4]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Kshana Contour" className="h-12 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection("about")}
              className="text-[#5C504A] hover:text-[#C05C3B] transition-colors font-medium"
            >
              About Us
            </button>
            <button 
              onClick={() => scrollToSection("gallery")}
              className="text-[#5C504A] hover:text-[#C05C3B] transition-colors font-medium"
            >
              Gallery
            </button>
            <button 
              onClick={() => scrollToSection("services")}
              className="text-[#5C504A] hover:text-[#C05C3B] transition-colors font-medium"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection("contact")}
              className="text-[#5C504A] hover:text-[#C05C3B] transition-colors font-medium"
            >
              Contact
            </button>
          </div>
          <Button
            onClick={() => setShowLoginModal(true)}
            className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-6 shadow-[0_4px_12px_rgba(192,92,59,0.25)]"
            data-testid="login-button"
          >
            <User className="w-4 h-4 mr-2" />
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="font-['Cormorant_Garamond'] text-5xl md:text-6xl lg:text-7xl font-light text-[#2D2420] leading-tight">
              Kshana Contour
            </h1>
            <p className="mt-4 text-lg tracking-[0.3em] text-[#8C3B24] font-medium">
              CLASSY. AESTHETIC. ELEGANT
            </p>
            <p className="mt-6 text-lg text-[#5C504A] max-w-xl">
              Where tradition meets contemporary elegance. We craft bespoke garments 
              with precision and passion, bringing your vision to life stitch by stitch.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={() => scrollToSection("contact")}
                className="bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full px-8 py-6 text-base shadow-[0_4px_12px_rgba(192,92,59,0.25)]"
                data-testid="contact-us-btn"
              >
                Contact Us
              </Button>
              <Button
                onClick={() => scrollToSection("gallery")}
                variant="outline"
                className="border-[#EFEBE4] text-[#2D2420] hover:border-[#C05C3B] hover:text-[#C05C3B] rounded-full px-8 py-6 text-base"
                data-testid="view-gallery-btn"
              >
                View Gallery
              </Button>
            </div>
          </div>
          <div className="lg:w-1/2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#D19B5A]/20 rounded-full blur-3xl" />
              <img 
                src={LOGO_URL} 
                alt="Kshana Contour Logo" 
                className="relative w-80 h-80 object-contain"
              />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 flex justify-center">
          <button 
            onClick={() => scrollToSection("about")}
            className="animate-bounce text-[#8A7D76]"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-[#F7F2EB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C3B24] mb-4">
              About Us
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl text-[#2D2420] font-medium">
              Crafting Dreams, One Stitch at a Time
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1753162658094-86e570c6a707?w=600"
                alt="Our Studio"
                className="rounded-2xl shadow-[0_8px_32px_-8px_rgba(139,102,85,0.15)]"
              />
            </div>
            <div className="space-y-6">
              <p className="text-lg text-[#5C504A] leading-relaxed">
                Welcome to <strong className="text-[#2D2420]">Kshana Contour</strong>, 
                your destination for exquisite tailoring and bespoke fashion. With years 
                of experience in crafting beautiful garments, we specialize in creating 
                pieces that blend traditional craftsmanship with modern aesthetics.
              </p>
              <p className="text-lg text-[#5C504A] leading-relaxed">
                From bridal blouses that make your special day unforgettable to everyday 
                alterations that ensure the perfect fit, our skilled artisans pour their 
                heart into every creation. We believe that clothing is more than fabric – 
                it's an expression of your unique personality.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="text-center">
                  <p className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#C05C3B]">500+</p>
                  <p className="text-sm text-[#8A7D76]">Happy Clients</p>
                </div>
                <div className="w-px h-16 bg-[#EFEBE4]" />
                <div className="text-center">
                  <p className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#C05C3B]">10+</p>
                  <p className="text-sm text-[#8A7D76]">Years Experience</p>
                </div>
                <div className="w-px h-16 bg-[#EFEBE4]" />
                <div className="text-center">
                  <p className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#C05C3B]">15+</p>
                  <p className="text-sm text-[#8A7D76]">Services</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C3B24] mb-4">
              Our Services
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl text-[#2D2420] font-medium">
              What We Offer
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div 
                key={index}
                className="bg-white border border-[#EFEBE4] rounded-2xl p-6 text-center card-hover shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#C05C3B]/10 flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-[#C05C3B]" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium text-[#2D2420]">{service}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 px-6 bg-[#F7F2EB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C3B24] mb-4">
              Our Work
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl text-[#2D2420] font-medium">
              Gallery
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {defaultGallery.map((item) => (
              <div 
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl"
              >
                <img 
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <p className="text-white font-medium">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C3B24] mb-4">
              Testimonials
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl text-[#2D2420] font-medium">
              What Our Clients Say
            </h2>
          </div>
          <div className="flex justify-center">
            <a 
              href="https://maps.app.goo.gl/c7z46uTDaKbCNvNr9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white border border-[#EFEBE4] rounded-2xl px-8 py-6 shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)] hover:shadow-[0_8px_32px_-8px_rgba(139,102,85,0.15)] transition-all"
              data-testid="google-reviews-link"
            >
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-[#5C504A]">View our Google Reviews</span>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-[#2D2420] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D19B5A] mb-4">
              Get in Touch
            </p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-medium">
              Contact Us
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <a 
              href="tel:+919187202605"
              className="flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="phone-contact"
            >
              <Phone className="w-8 h-8 text-[#D19B5A] mb-4" />
              <p className="text-lg font-medium">Call Us</p>
              <p className="text-white/70 mt-2">9187202605</p>
              <p className="text-white/70">9108253760</p>
            </a>
            <a 
              href="mailto:kshanaconture@gmail.com"
              className="flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="email-contact"
            >
              <Mail className="w-8 h-8 text-[#D19B5A] mb-4" />
              <p className="text-lg font-medium">Email Us</p>
              <p className="text-white/70 mt-2">kshanaconture@gmail.com</p>
            </a>
            <a 
              href="https://maps.app.goo.gl/c7z46uTDaKbCNvNr9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="location-contact"
            >
              <MapPin className="w-8 h-8 text-[#D19B5A] mb-4" />
              <p className="text-lg font-medium">Visit Us</p>
              <p className="text-white/70 mt-2 text-center">View on Google Maps</p>
            </a>
          </div>
          <div className="mt-12 flex justify-center gap-6">
            <a 
              href="https://wa.me/919187202605"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full hover:bg-[#20BD5A] transition-colors"
              data-testid="whatsapp-link"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
            <a 
              href="https://www.instagram.com/kshana_contour"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
              data-testid="instagram-link"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#1A1614] text-white/60 text-center">
        <p>&copy; 2024 Kshana Contour. All rights reserved.</p>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/919187202605"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        data-testid="whatsapp-float"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-[#FDFBF7] border-[#EFEBE4]">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-2xl text-center text-[#2D2420]">
              Choose Your Portal
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <Button
              onClick={() => {
                setShowLoginModal(false);
                navigate("/login");
              }}
              className="h-20 bg-white border-2 border-[#EFEBE4] hover:border-[#C05C3B] hover:bg-[#F7F2EB] text-[#2D2420] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
              data-testid="customer-portal-btn"
            >
              <User className="w-6 h-6 text-[#C05C3B]" />
              <span className="font-medium">Customer Portal</span>
              <span className="text-xs text-[#8A7D76]">View your orders & measurements</span>
            </Button>
            <Button
              onClick={() => {
                setShowLoginModal(false);
                navigate("/admin/login");
              }}
              className="h-20 bg-white border-2 border-[#EFEBE4] hover:border-[#C05C3B] hover:bg-[#F7F2EB] text-[#2D2420] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
              data-testid="admin-portal-btn"
            >
              <ShieldCheck className="w-6 h-6 text-[#C05C3B]" />
              <span className="font-medium">Admin Portal</span>
              <span className="text-xs text-[#8A7D76]">Manage orders & business</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
