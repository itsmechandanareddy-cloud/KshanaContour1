import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Phone, Mail, MapPin, Instagram, MessageCircle, 
  User, ShieldCheck, Star, Scissors, ArrowRight, Download, Share2, X
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/4m7v7k4y_image.png";
const SKETCH_URL = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/a4jq30f0_image.png";
const ABOUT_IMG = "https://customer-assets.emergentagent.com/job_869a086f-518b-43e3-a2ba-4fade532d0ef/artifacts/sybd095l_image.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Detect if not installed as PWA and on mobile
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const dismissed = sessionStorage.getItem("installBannerDismissed");
    if (!isStandalone && !dismissed) {
      setTimeout(() => setShowInstallBanner(true), 3000);
    }
  }, []);

  useEffect(() => {
    axios.get(`${API}/reviews`).then(r => setReviews(r.data)).catch(() => {});
    axios.get(`${API}/gallery`).then(r => {
      const items = r.data.map(g => ({
        id: g.id,
        image_url: g.file_id ? `${API}/gallery/image/${g.file_id}` : g.image_url,
        title: g.title
      }));
      setGallery(items);
    }).catch(() => {});
  }, []);

  // Auto-slide gallery every 15 seconds
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

  const services = [
    "Bridal Blouses", "Traditional Blouses", "Contemporary Blouses",
    "Hand Work", "Machine Work", "Saree Lace & Kuchu",
    "Men's Wear", "Kids Wear", "Custom Alterations"
  ];

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[#FDFBF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/90 backdrop-blur-sm z-50 border-b border-[#2D2420]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Kshana Contour" className="h-12 w-12 object-contain" />
            <span className="font-['Cormorant_Garamond'] text-xl font-light text-[#2D2420] hidden sm:block tracking-wide">Kshana Contour</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {["about", "gallery", "services", "contact"].map((s) => (
              <button key={s} onClick={() => scrollTo(s)}
                className="text-xs uppercase tracking-[0.2em] text-[#2D2420]/60 hover:text-[#2D2420] transition-colors duration-300">
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowLoginModal(true)}
            className="bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none px-6 py-2 text-xs uppercase tracking-[0.15em] transition-all duration-300"
            data-testid="login-button">
            Login
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-0 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 py-20 lg:py-32">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A]">Bespoke Tailoring</p>
            <h1 className="font-['Cormorant_Garamond'] text-6xl md:text-7xl lg:text-8xl font-light text-[#2D2420] leading-[0.9]">
              Kshana<br />Contour
            </h1>
            <div className="w-16 h-px bg-[#D19B5A]" />
            <p className="text-base text-[#2D2420]/60 max-w-md leading-relaxed">
              Where tradition meets contemporary elegance. We craft bespoke garments 
              with precision and passion, bringing your vision to life.
            </p>
            <div className="flex gap-4 pt-4">
              <Button onClick={() => scrollTo("contact")}
                className="bg-[#2D2420] hover:bg-[#2D2420]/90 text-[#FDFBF7] rounded-none px-8 py-6 text-xs uppercase tracking-[0.15em]"
                data-testid="contact-us-btn">
                Get in Touch <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
              </Button>
              <Button onClick={() => scrollTo("gallery")} variant="outline"
                className="border-[#2D2420]/20 text-[#2D2420] hover:border-[#2D2420] rounded-none px-8 py-6 text-xs uppercase tracking-[0.15em]"
                data-testid="view-gallery-btn">
                Our Work
              </Button>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute top-8 right-8 w-[85%] h-[90%] border border-[#D19B5A]/20" />
            <img src={SKETCH_URL} alt="Fashion Sketch"
              className="relative w-full max-w-lg object-contain" />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-[#2D2420]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-full h-full border border-[#D19B5A]/15" />
              <img src={ABOUT_IMG} alt="Kshana Contour Boutique"
                className="relative w-full object-cover aspect-[4/5]" />
            </div>
            <div className="space-y-8">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A]">Our Story</p>
              <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#2D2420] leading-tight">
                Crafting Dreams,<br />One Stitch at a Time
              </h2>
              <div className="w-12 h-px bg-[#2D2420]/20" />
              <p className="text-[#2D2420]/60 leading-relaxed">
                Welcome to <span className="text-[#2D2420] font-medium">Kshana Contour</span>, 
                your destination for exquisite tailoring and bespoke fashion. From bridal blouses 
                that make your special day unforgettable to everyday alterations that ensure the 
                perfect fit, our artisans pour their heart into every creation.
              </p>
              <div className="flex items-center gap-12 pt-6">
                {[["500+", "Clients"], ["10+", "Years"], ["15+", "Services"]].map(([n, l]) => (
                  <div key={l}>
                    <p className="font-['Cormorant_Garamond'] text-4xl font-light text-[#2D2420]">{n}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2D2420]/40 mt-1">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-[#2D2420]/10 bg-[#2D2420]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-6">What We Offer</p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#FDFBF7]">Our Services</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-px bg-white/10">
            {services.map((service, i) => (
              <div key={i} className="bg-[#2D2420] p-8 lg:p-12 text-center group hover:bg-[#3D3430] transition-colors duration-500">
                <Scissors className="w-5 h-5 text-[#D19B5A] mx-auto mb-4 group-hover:rotate-45 transition-transform duration-500" strokeWidth={1.5} />
                <h3 className="font-['Cormorant_Garamond'] text-lg text-[#FDFBF7] font-light">{service}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery — Rolling Carousel */}
      <section id="gallery" className="border-t border-[#2D2420]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-4">Portfolio</p>
              <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#2D2420]">Our Work</h2>
            </div>
            {gallery.length > 3 && (
              <div className="flex gap-2">
                <button onClick={() => setSlideIndex(prev => (prev - 1 + gallery.length) % gallery.length)}
                  className="w-10 h-10 border border-[#2D2420]/15 flex items-center justify-center hover:border-[#2D2420] transition-colors">
                  <ArrowRight className="w-4 h-4 rotate-180 text-[#2D2420]" />
                </button>
                <button onClick={() => setSlideIndex(prev => (prev + 1) % gallery.length)}
                  className="w-10 h-10 border border-[#2D2420]/15 flex items-center justify-center hover:border-[#2D2420] transition-colors">
                  <ArrowRight className="w-4 h-4 text-[#2D2420]" />
                </button>
              </div>
            )}
          </div>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="gallery-carousel">
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
          ) : (
            <div className="text-center py-16">
              <p className="text-[#8A7D76] text-sm">Gallery coming soon</p>
            </div>
          )}
          {gallery.length > 3 && (
            <div className="flex justify-center gap-1.5 mt-8">
              {gallery.map((_, i) => (
                <button key={i} onClick={() => setSlideIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${i === slideIndex ? "bg-[#D19B5A] w-6" : "bg-[#2D2420]/15"}`} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews / Testimonials */}
      <section id="reviews" className="border-t border-[#2D2420]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-4">Testimonials</p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#2D2420]">
              What Our Clients Say
            </h2>
          </div>

          {reviews.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {reviews.slice(0, 6).map((rev) => (
                <div key={rev.id} className="bg-white border border-[#EFEBE4] p-8 space-y-4 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= rev.rating ? "text-[#D19B5A] fill-[#D19B5A]" : "text-[#EFEBE4]"}`} />
                    ))}
                  </div>
                  <p className="text-[#5C504A] text-sm leading-relaxed italic">"{rev.review_text}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-[#EFEBE4]">
                    <div className="w-8 h-8 rounded-full bg-[#2D2420]/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#2D2420]">{rev.reviewer_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2D2420]">{rev.reviewer_name}</p>
                      {rev.source && <p className="text-[10px] uppercase tracking-wider text-[#8A7D76]">via {rev.source}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center mb-12">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-[#D19B5A] fill-[#D19B5A]" />)}
              </div>
              <p className="font-['Cormorant_Garamond'] text-2xl font-light text-[#2D2420]">Loved by our clients</p>
            </div>
          )}

          <div className="text-center">
            <button onClick={() => window.open("https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8", "_blank")}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#2D2420]/40 hover:text-[#D19B5A] transition-colors"
              data-testid="google-reviews-link">
              <Star className="w-4 h-4" />View All Google Reviews
            </button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-[#2D2420]/10 bg-[#2D2420]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <div className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D19B5A] mb-6">Get in Touch</p>
            <h2 className="font-['Cormorant_Garamond'] text-4xl md:text-5xl font-light text-[#FDFBF7]">Contact Us</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {[
              { href: "tel:+919187202605", icon: Phone, title: "Call", detail: ["9187202605", "9108253760"] },
              { href: "mailto:kshanaconture@gmail.com", icon: Mail, title: "Email", detail: ["kshanaconture@gmail.com"] },
              { href: "https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8", icon: MapPin, title: "Visit", detail: ["View on Google Maps"] },
            ].map(({ href, icon: Icon, title, detail }) => (
              <a key={title} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="bg-[#2D2420] p-10 text-center hover:bg-[#3D3430] transition-colors duration-300" data-testid={`${title.toLowerCase()}-contact`}>
                <Icon className="w-6 h-6 text-[#D19B5A] mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-xs uppercase tracking-[0.2em] text-[#FDFBF7]/40 mb-3">{title}</p>
                {detail.map((d, i) => <p key={i} className="text-[#FDFBF7]/70 text-sm">{d}</p>)}
              </a>
            ))}
          </div>
          <div className="mt-16 flex justify-center gap-4">
            <a href="https://wa.me/919187202605" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#FDFBF7]/20 text-[#FDFBF7] px-6 py-3 rounded-none hover:bg-[#FDFBF7] hover:text-[#2D2420] transition-all duration-300 text-xs uppercase tracking-[0.15em]"
              data-testid="whatsapp-link">
              <MessageCircle className="w-4 h-4" strokeWidth={1.5} />WhatsApp
            </a>
            <a href="https://www.instagram.com/kshana_contour?igsh=ZWl5eDBuemxrZnVm" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#FDFBF7]/20 text-[#FDFBF7] px-6 py-3 rounded-none hover:bg-[#FDFBF7] hover:text-[#2D2420] transition-all duration-300 text-xs uppercase tracking-[0.15em]"
              data-testid="instagram-link">
              <Instagram className="w-4 h-4" strokeWidth={1.5} />Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#1A1614] text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#FDFBF7]/30">&copy; 2026 Kshana Contour. All rights reserved.</p>
      </footer>

      {/* WhatsApp Float */}
      <a href="https://wa.me/919187202605" target="_blank" rel="noopener noreferrer"
        className="whatsapp-float" data-testid="whatsapp-float">
        <MessageCircle className="w-7 h-7" />
      </a>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-[#FDFBF7] border-[#2D2420]/10 rounded-none">
          <DialogHeader>
            <DialogTitle className="font-['Cormorant_Garamond'] text-3xl text-center text-[#2D2420] font-light">
              Welcome
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-6">
            <Button onClick={() => { setShowLoginModal(false); navigate("/login"); }}
              className="h-20 bg-[#FDFBF7] border border-[#2D2420]/10 hover:border-[#2D2420] text-[#2D2420] rounded-none flex flex-col items-center justify-center gap-2 transition-all duration-300"
              data-testid="customer-portal-btn">
              <User className="w-5 h-5 text-[#D19B5A]" strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-[0.15em]">Customer Portal</span>
            </Button>
            <Button onClick={() => { setShowLoginModal(false); navigate("/admin/login"); }}
              className="h-20 bg-[#FDFBF7] border border-[#2D2420]/10 hover:border-[#2D2420] text-[#2D2420] rounded-none flex flex-col items-center justify-center gap-2 transition-all duration-300"
              data-testid="admin-portal-btn">
              <ShieldCheck className="w-5 h-5 text-[#D19B5A]" strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-[0.15em]">Admin Portal</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install App Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-fade-in">
          <div className="bg-[#2D2420] rounded-sm p-4 shadow-2xl border border-[#D19B5A]/20">
            <button onClick={() => { setShowInstallBanner(false); sessionStorage.setItem("installBannerDismissed", "1"); }}
              className="absolute top-2 right-2 text-[#FDFBF7]/40 hover:text-[#FDFBF7]">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#D19B5A]/20 rounded-sm flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-[#D19B5A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#FDFBF7]">Install Kshana App</p>
                <p className="text-[10px] text-[#FDFBF7]/50 mt-0.5">Add to home screen for quick access</p>
              </div>
              <button onClick={() => { setShowInstallBanner(false); setShowInstallGuide(true); }}
                className="px-4 py-2 bg-[#D19B5A] text-[#2D2420] text-xs uppercase tracking-wider font-medium rounded-sm hover:bg-[#C05C3B] hover:text-white transition-colors"
                data-testid="install-app-btn">
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Guide Modal */}
      <Dialog open={showInstallGuide} onOpenChange={setShowInstallGuide}>
        <DialogContent className="sm:max-w-md bg-[#FDFBF7] border-[#2D2420]/10 rounded-none p-0 overflow-hidden">
          <div className="bg-[#2D2420] p-6 text-center">
            <Download className="w-8 h-8 text-[#D19B5A] mx-auto mb-3" />
            <h2 className="font-['Cormorant_Garamond'] text-2xl text-[#FDFBF7] font-light">Install Kshana App</h2>
            <p className="text-xs text-[#FDFBF7]/50 mt-1 uppercase tracking-wider">Free &middot; No App Store needed</p>
          </div>
          <div className="p-6 space-y-5">
            {/* iOS Instructions */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-3">iPhone / iPad (Safari)</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                  <p className="text-sm text-[#2D2420]">Tap the <Share2 className="w-4 h-4 inline text-[#C05C3B]" /> <b>Share</b> button at the bottom of Safari</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                  <p className="text-sm text-[#2D2420]">Scroll down and tap <b>"Add to Home Screen"</b></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                  <p className="text-sm text-[#2D2420]">Tap <b>"Add"</b> — the Kshana app icon appears on your home screen</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#EFEBE4]" />

            {/* Android Instructions */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8A7D76] mb-3">Android (Chrome)</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                  <p className="text-sm text-[#2D2420]">Tap the <b>three dots menu</b> (top-right in Chrome)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                  <p className="text-sm text-[#2D2420]">Tap <b>"Install app"</b> or <b>"Add to Home Screen"</b></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-[#2D2420] text-[#D19B5A] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                  <p className="text-sm text-[#2D2420]">Tap <b>"Install"</b> — done!</p>
                </div>
              </div>
            </div>

            <button onClick={() => setShowInstallGuide(false)}
              className="w-full py-3 bg-[#2D2420] text-[#FDFBF7] text-xs uppercase tracking-[0.15em] hover:bg-[#C05C3B] transition-colors">
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
