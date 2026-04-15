# Kshana Contour Boutique - PRD

## Architecture
- **Backend**: FastAPI + MongoDB | **Frontend**: React + TailwindCSS + Shadcn UI | **Storage**: Emergent Object Storage

## Implemented Features
- [x] Landing page, Gallery, Services, Contact
- [x] Admin & Customer JWT auth
- [x] Order CRUD (items, measurements, billing, payments, delete with reason)
- [x] Per-item reference image uploads + neck design references
- [x] Invoice/print generation
- [x] WhatsApp messaging on status change
- [x] Employee management (Master/Tailor/Worker), work assignment, delete, docs
- [x] Gallery with file upload (object storage)
- [x] Materials tracking with Edit/Delete
- [x] Reports: Net summary, financial cards, clickable status cards
- [x] **Partnership page** (separate admin page):
  - Chandana/Akanksha investment CRUD (add/edit/delete records)
  - Kshana Account (income auto-linked to orders, manual outgoing entries)
  - 70+ real entries seeded, monthly breakdown table
  - Profit split: investments returned first, then 50/50
- [x] All Select dropdowns fixed (empty string → undefined)

## Test Credentials
- **Admin**: Phone: 9876543210, Password: admin123
- **Customer**: Phone: 9876543211, DOB: 1990-05-15
