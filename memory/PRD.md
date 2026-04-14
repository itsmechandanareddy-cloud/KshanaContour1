# Kshana Contour Boutique - Product Requirements Document

## Original Problem Statement
Build a website for Kshana Contour Boutique with:
- Customer facing portal with login (phone + DOB), gallery, reviews, WhatsApp chat, order tracking
- Admin portal with dashboard, order management with measurements, billing, employees, materials, reports

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Storage**: Emergent Object Storage (employee docs, gallery images)

## What's Been Implemented
- [x] Public landing page with logo, About, Gallery, Services, Contact
- [x] Login modal with Customer/Admin portal selection
- [x] Admin Dashboard with stats, charts, due-soon warnings
- [x] Order creation with items + ONE measurement section per order
- [x] Measurements: Padded, Princess Cut, Open, 15 body measurements, neckline
- [x] Service dropdown with 17 service types + blouse type radio
- [x] Order status management (pending > in_progress > ready > delivered)
- [x] Payment tracking with multiple payments per order
- [x] Order Print/Invoice (items + billing only, no measurements)
- [x] WhatsApp messaging on status change (auto-opens wa.me with pre-filled message)
- [x] WhatsApp button on each order for manual messaging
- [x] Employee management with payments, hours, document uploads
- [x] Admin Gallery with direct image file upload (object storage)
- [x] Materials/Raw materials tracking
- [x] Reports page with monthly/weekly stats
- [x] Customer portal with order list, order details, measurements view
- [x] WhatsApp floating button, Google Reviews link, Contact info

## Prioritized Backlog
### P0 - None remaining
### P1
- Customer notifications on order status change (email/push)
### P2
- Bulk order import
- Order search by date range

## Test Credentials
- **Admin**: Phone: 9876543210, Password: admin123
- **Customer**: Phone: 9876543211, DOB: 1990-05-15 (Vishala)
