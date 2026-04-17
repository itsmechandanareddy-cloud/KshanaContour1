# Kshana Contour Boutique - PRD

## Architecture
- **Backend**: FastAPI + MongoDB | **Frontend**: React + TailwindCSS + Shadcn UI (native `<select>` for dropdowns) | **Storage**: Cloudinary (production)
- **Deployment**: Split Architecture — Vercel (Frontend), Render (Backend), MongoDB Atlas (Production DB)

## Implemented Features
- [x] Landing page with dynamic gallery carousel (auto-rotates 15s) + testimonials
- [x] Admin & Customer JWT auth (Admin: phone+password, Customer: name+password)
- [x] Customer dedup: matches by phone OR name — no duplicate accounts
- [x] Customer autocomplete in order form (search by name/phone)
- [x] Admin Customer management page (search, edit, delete, reset password)
- [x] Order CRUD with per-item measurements & image uploads (64 orders seeded)
- [x] **Dynamic measurement charts**: Dropdown + Add button for Blouse, Kurta Top, Lehenga, Pant, Kids, Men's Shirt, Men's Pant — multiple per order
- [x] Invoice generation + Send via WhatsApp + Save & Invoice for new orders
- [x] Employee management with pay types, hours tracking, documents
- [x] Gallery with upload + mobile-friendly delete
- [x] Materials tracking, Reports, Partnership page
- [x] Reviews management with rating distribution graph
- [x] Editorial Luxury aesthetic throughout
- [x] **Export Center**: Export Orders, Employees, Partnership, Incoming/Outgoing Payments to .xlsx
- [x] **Incoming Payments Seeded**: 52 real payment records from Tracker.xlsx mapped to KSH-XX orders
- [x] **Partnership Income Tracking**: UPI payments → Kshana account, Cash payments → Cash account (5 tabs: Chandana, Akanksha, Kshana Out, Kshana UPI, Cash)

## Test Credentials
- **Admin**: Phone: 9187202605, Password: admin123
- **Customer**: Name: Vishala, Password: 9876543211

## Key Technical Notes
- DO NOT use Shadcn `<Select>` — use native `<select>` only
- Customer dedup: check phone first, then name (case-insensitive)
- Measurements stored as flat dict with prefixed keys (blouse_*, kurta_*, kids_*, mens_shirt_*, mens_pant_*)
- Order IDs sequential: KSH-XX
- Partnership entries have `type` field: "income" or "expense"
- Partnership income entries have `kshana` (UPI) and `cash` fields for income tracking
- DO NOT reintroduce craco, vercel.json with strict engine requirements, or .nvmrc
- DO NOT downgrade pymongo or motor

## Pending Tasks
- P1: SMS Notifications via Twilio (pending user API keys)
- P2: WhatsApp direct messaging integration

## Data Status
- 64 orders seeded with real customer data
- 52 incoming payment records seeded (UPI: ₹1,47,110, Cash: ₹29,150)
- 70 partnership expense entries seeded
- Employee payment histories linked to order IDs
- Google reviews seeded
