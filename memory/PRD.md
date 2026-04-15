# Kshana Contour Boutique - PRD

## Architecture
- **Backend**: FastAPI + MongoDB | **Frontend**: React + TailwindCSS + Shadcn UI (native `<select>` for dropdowns) | **Storage**: Emergent Object Storage

## Implemented Features
- [x] Landing page, Gallery, Services, Contact (all links verified)
- [x] Admin & Customer JWT auth (Admin: phone+password, Customer: phone+DOB)
- [x] Order CRUD (items, measurements, billing, payments, delete with reason)
- [x] Per-item reference image uploads + neck design references
- [x] Invoice/print generation with View Invoice in billing summary
- [x] Send Invoice via WhatsApp + Save & Generate Invoice on new order creation
- [x] WhatsApp/SMS manual notify modal on status change
- [x] Employee management (Master/Tailor/Worker), work assignment, docs upload, delete
- [x] Employee pay types (Hourly/Weekly), auto-calculation from hours
- [x] Gallery with file upload (object storage) + always-visible delete button (mobile-friendly)
- [x] Materials tracking with Edit/Delete
- [x] Reports: Net summary, financial cards, clickable status cards
- [x] Partnership page (Chandana/Akanksha investment CRUD, Kshana Account, profit split)
- [x] Order search/filter: search, status, date range, sort, result counts
- [x] **Reviews management**: Admin CRUD for customer reviews with rating distribution graph
- [x] **Testimonials on landing page**: Dynamic review cards fetched from API
- [x] Editorial Luxury aesthetic (dark bg, gold accents, serif typography)
- [x] Sequential order IDs (KSH-01, KSH-02, etc.)
- [x] All Shadcn Select replaced with native HTML `<select>` for mobile
- [x] All external links fixed: Instagram, Google Maps, WhatsApp, Email (using window.open)

## Contact Links
- Instagram: https://www.instagram.com/kshana_contour?igsh=ZWl5eDBuemxrZnVm
- Google Maps: https://maps.app.goo.gl/3RAsjwkSV7S3FCCA8
- WhatsApp: https://wa.me/919187202605
- Email: mailto:kshanaconture@gmail.com

## Test Credentials
- **Admin**: Phone: 9187202605, Password: admin123
- **Customer**: Phone: 9876543211, DOB: 1990-05-15

## Key API Endpoints
- Reviews: GET/POST /api/reviews, PUT/DELETE /api/reviews/{id}, GET /api/reviews/stats
- Gallery: GET/POST /api/gallery, DELETE /api/gallery/{id}, POST /api/gallery/upload
- Orders: Full CRUD with payments, images, status updates, WhatsApp messaging

## Upcoming Tasks
- P1: Bulk order import functionality
- P1: Ensure native `<select>` elements styled consistently with luxury aesthetic
- P2: Customer email notifications
- P2: Admin gallery image upload UX improvements

## Key Technical Notes
- DO NOT use Shadcn `<Select>` components in admin forms - use native `<select>` only
- Use `window.open()` for external links (not `<a>` wrapping `<Button>`) to avoid blocked clicks
- Order IDs are sequential: KSH-XX
- Object Storage via Emergent integrations
