import AdminLayout from "../../components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  Star, Phone, Mail, MapPin, Instagram, MessageCircle, 
  ExternalLink, Copy
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
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in" data-testid="admin-reviews">
        {/* Header */}
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-medium text-[#2D2420]">
          Reviews & Contact
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Google Reviews */}
          <Card className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420] flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Google Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#5C504A]">
                View and manage your Google Business reviews. Encourage satisfied customers to leave reviews.
              </p>
              <div className="flex -space-x-1 my-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <a 
                href={CONTACT_INFO.googleReviews}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-[#C05C3B] hover:bg-[#A84C2F] text-white rounded-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Google Reviews
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone Numbers */}
              <div className="flex items-center justify-between p-4 bg-[#F7F2EB] rounded-xl">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#C05C3B]" />
                  <div>
                    <p className="text-sm text-[#8A7D76]">Phone</p>
                    <p className="text-[#2D2420]">{CONTACT_INFO.phone1}, {CONTACT_INFO.phone2}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => copyToClipboard(CONTACT_INFO.phone1, "Phone")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-4 bg-[#F7F2EB] rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#C05C3B]" />
                  <div>
                    <p className="text-sm text-[#8A7D76]">Email</p>
                    <p className="text-[#2D2420]">{CONTACT_INFO.email}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => copyToClipboard(CONTACT_INFO.email, "Email")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Location */}
              <div className="flex items-center justify-between p-4 bg-[#F7F2EB] rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#C05C3B]" />
                  <div>
                    <p className="text-sm text-[#8A7D76]">Location</p>
                    <p className="text-[#2D2420]">View on Google Maps</p>
                  </div>
                </div>
                <a href={CONTACT_INFO.googleMaps} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Links */}
        <Card className="bg-white border-[#EFEBE4] shadow-[0_4px_24px_-8px_rgba(139,102,85,0.08)]">
          <CardHeader>
            <CardTitle className="font-['Cormorant_Garamond'] text-xl text-[#2D2420]">
              Social Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* WhatsApp */}
              <a 
                href={`https://wa.me/91${CONTACT_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-6 bg-[#25D366]/10 rounded-2xl hover:bg-[#25D366]/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-[#2D2420]">WhatsApp</p>
                  <p className="text-sm text-[#5C504A]">+91 {CONTACT_INFO.whatsapp}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-[#8A7D76] ml-auto" />
              </a>

              {/* Instagram */}
              <a 
                href={CONTACT_INFO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-[#2D2420]">Instagram</p>
                  <p className="text-sm text-[#5C504A]">@kshana_contour</p>
                </div>
                <ExternalLink className="w-5 h-5 text-[#8A7D76] ml-auto" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#F7F2EB] border-[#EFEBE4]">
          <CardContent className="p-6">
            <h3 className="font-medium text-[#2D2420] mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <a href={`tel:+91${CONTACT_INFO.phone1}`}>
                <Button variant="outline" className="border-[#EFEBE4] rounded-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </a>
              <a href={`mailto:${CONTACT_INFO.email}`}>
                <Button variant="outline" className="border-[#EFEBE4] rounded-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </a>
              <a href={`https://wa.me/91${CONTACT_INFO.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ReviewsContact;
