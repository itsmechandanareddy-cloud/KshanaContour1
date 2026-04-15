# Kshana Contour Boutique - PRD

## Architecture
- **Backend**: FastAPI + MongoDB | **Frontend**: React + TailwindCSS + Shadcn UI (native `<select>` for dropdowns) | **Storage**: Emergent Object Storage

## Implemented Features
- [x] Landing page with dynamic gallery carousel (auto-rotates 15s) + testimonials
- [x] Admin & Customer JWT auth (Admin: phone+password, Customer: name+password)
- [x] Customer dedup: matches by phone OR name — no duplicate accounts
- [x] Customer autocomplete in order form (search by name/phone)
- [x] Admin Customer management page (search, edit, delete, reset password)
- [x] Order CRUD with per-item measurements & image uploads
- [x] **Dynamic measurement charts**: Dropdown + Add button for Blouse, Kurta Top, Lehenga, Pant, Kids, Men's Shirt, Men's Pant — multiple per order
- [x] Invoice generation + Send via WhatsApp + Save & Invoice for new orders
- [x] Employee management with pay types, hours tracking, documents
- [x] Gallery with upload + mobile-friendly delete
- [x] Materials tracking, Reports, Partnership page
- [x] Reviews management with rating distribution graph
- [x] Editorial Luxury aesthetic throughout

## Test Credentials
- **Admin**: Phone: 9187202605, Password: admin123
- **Customer**: Name: Vishala, Password: 9876543211

## Key Technical Notes
- DO NOT use Shadcn `<Select>` — use native `<select>` only
- Customer dedup: check phone first, then name (case-insensitive)
- Measurements stored as flat dict with prefixed keys (blouse_*, kurta_*, kids_*, mens_shirt_*, mens_pant_*)
- Order IDs sequential: KSH-XX
