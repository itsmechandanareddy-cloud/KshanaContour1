"""Generate Kshana Contour Website Manual PDF with screenshots"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from PIL import Image as PILImage
import os

W, H = A4
MARGIN = 40

doc = SimpleDocTemplate(
    "/app/Kshana_Contour_Manual.pdf",
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Title2", fontName="Times-Bold", fontSize=28, textColor=HexColor("#2D2420"), alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="Subtitle", fontName="Times-Roman", fontSize=14, textColor=HexColor("#8A7D76"), alignment=TA_CENTER, spaceAfter=30))
styles.add(ParagraphStyle(name="SectionTitle", fontName="Times-Bold", fontSize=18, textColor=HexColor("#C05C3B"), spaceBefore=20, spaceAfter=10))
styles.add(ParagraphStyle(name="SubSection", fontName="Times-Bold", fontSize=13, textColor=HexColor("#2D2420"), spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name="Body2", fontName="Times-Roman", fontSize=11, textColor=HexColor("#2D2420"), alignment=TA_JUSTIFY, spaceAfter=8, leading=16))
styles.add(ParagraphStyle(name="BulletItem", fontName="Times-Roman", fontSize=11, textColor=HexColor("#2D2420"), leftIndent=20, bulletIndent=10, spaceAfter=4, leading=16))
styles.add(ParagraphStyle(name="Note", fontName="Times-Italic", fontSize=10, textColor=HexColor("#7E8B76"), leftIndent=15, spaceAfter=8, leading=14))
styles.add(ParagraphStyle(name="Cred", fontName="Courier", fontSize=11, textColor=HexColor("#2D2420"), backColor=HexColor("#F7F2EB"), leftIndent=15, spaceAfter=4, leading=16))

story = []

def add_img(path, max_width=480):
    # Check jpeg version
    if not os.path.exists(path):
        path = path.replace(".png", ".jpeg")
    if not os.path.exists(path):
        return
    img = PILImage.open(path)
    w, h = img.size
    ratio = min(max_width / w, 350 / h)
    story.append(Image(path, width=w*ratio, height=h*ratio))
    story.append(Spacer(1, 10))

# Cover Page
story.append(Spacer(1, 120))
story.append(Paragraph("Kshana Contour", styles["Title2"]))
story.append(Paragraph("CLASSY. AESTHETIC. ELEGANT.", styles["Subtitle"]))
story.append(Spacer(1, 30))
story.append(Paragraph("Website User Manual", ParagraphStyle(name="CoverTitle", fontName="Times-Bold", fontSize=22, textColor=HexColor("#D19B5A"), alignment=TA_CENTER)))
story.append(Spacer(1, 15))
story.append(Paragraph("Complete guide for Admin & Customer Portal", ParagraphStyle(name="CoverSub", fontName="Times-Roman", fontSize=12, textColor=HexColor("#8A7D76"), alignment=TA_CENTER)))
story.append(Spacer(1, 60))
story.append(Paragraph("Version 1.0 | April 2026", ParagraphStyle(name="Ver", fontName="Times-Roman", fontSize=10, textColor=HexColor("#8A7D76"), alignment=TA_CENTER)))
story.append(PageBreak())

# Table of Contents
story.append(Paragraph("Table of Contents", styles["SectionTitle"]))
toc = [
    "1. Overview",
    "2. Landing Page (Public Website)",
    "3. Admin Portal",
    "   3.1 Admin Login",
    "   3.2 Dashboard",
    "   3.3 Orders Management",
    "   3.4 Order Detail & Invoice",
    "   3.5 Customers Management",
    "   3.6 Employees Management",
    "   3.7 Raw Materials",
    "   3.8 Partnership & Accounts",
    "   3.9 Gallery Management",
    "   3.10 Reviews Management",
    "   3.11 Reports & Export Center",
    "   3.12 Settings (Password Change)",
    "4. Customer Portal",
    "5. Quick Reference & Credentials",
]
for item in toc:
    story.append(Paragraph(item, styles["Body2"]))
story.append(PageBreak())

# 1. Overview
story.append(Paragraph("1. Overview", styles["SectionTitle"]))
story.append(Paragraph("Kshana Contour is a full-stack boutique management platform designed for managing tailoring orders, employee payroll, customer accounts, financial partnerships, and gallery showcases. The website has two main portals:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Admin Portal</b> — Full business management dashboard for the boutique owner", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Customer Portal</b> — Allows customers to view their order status, payment history, and boutique gallery", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Public Landing Page</b> — Showcases the boutique with gallery, services, reviews, and contact info", styles["BulletItem"]))
story.append(PageBreak())

# 2. Landing Page
story.append(Paragraph("2. Landing Page (Public Website)", styles["SectionTitle"]))
story.append(Paragraph("The landing page is the first thing visitors see. It features:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Navigation</b> — About, Gallery, Services, Contact, Login", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Hero Section</b> — Boutique branding with 'Get In Touch' and 'Our Work' buttons", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Gallery Carousel</b> — Auto-rotating showcase of boutique work (15-second intervals)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Google Reviews</b> — Dynamic customer testimonials pulled from the database", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Contact Links</b> — WhatsApp, Google Maps, Instagram direct links", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_01_landing.png")
story.append(PageBreak())

# 3. Admin Portal
story.append(Paragraph("3. Admin Portal", styles["SectionTitle"]))

# 3.1 Login
story.append(Paragraph("3.1 Admin Login", styles["SubSection"]))
story.append(Paragraph("Access the admin portal by clicking 'LOGIN' on the landing page, then select 'Admin Login'. Enter your phone number and password.", styles["Body2"]))
story.append(Paragraph("Phone: 9187202605", styles["Cred"]))
story.append(Paragraph("Password: admin123", styles["Cred"]))
story.append(Paragraph("<i>Note: Password can be changed in Settings with email verification to kshanaconture@gmail.com</i>", styles["Note"]))
add_img("/tmp/manual_imgs/manual_02_admin_login.png")
story.append(PageBreak())

# 3.2 Dashboard
story.append(Paragraph("3.2 Dashboard", styles["SubSection"]))
story.append(Paragraph("The admin dashboard provides a complete overview of your boutique business:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Monthly/Weekly Metrics</b> — Shows current month name (e.g., 'April Orders') and week date range (e.g., '14/04 - 20/04')", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Urgent Deliveries</b> — Orders nearing or past their delivery date. Click the colored status pill to instantly update status (Pending → In Progress → Ready → Delivered). Click the eye icon to view order details.", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Order Pipeline</b> — Shows count of Pending, In Progress, Ready, and Due Soon orders", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Financial Overview</b> — Total Income, SBI Outgoing, Net Profit, Chandana/Akanksha Invested, Balance Due", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Quick Access</b> — Grid of shortcuts to all admin pages", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Team</b> — Shows employee avatars", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Charts</b> — Monthly Orders and Monthly Revenue bar charts", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Export Center</b> — Download Excel reports for Orders, Employees, Partnership, and Payments", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_03_dashboard.png")
story.append(Spacer(1, 10))
add_img("/tmp/manual_imgs/manual_03b_dashboard_bottom.png")
story.append(PageBreak())

# 3.3 Orders
story.append(Paragraph("3.3 Orders Management", styles["SubSection"]))
story.append(Paragraph("The Orders page shows all 64+ boutique orders with full CRUD functionality:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Search</b> — Filter by order ID, customer name, or phone", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Status Filter</b> — All Status, Pending, In Progress, Ready, Delivered", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Date Range</b> — Filter orders by date range", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Actions</b> — View (edit order), Invoice (generate/print), Notify (WhatsApp/SMS), Delete", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>New Order</b> — Click '+ New Order' to create with customer autocomplete", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Each order shows: Order ID (KSH-XX), customer name, phone, delivery date, total amount, and balance due (in red)", styles["Body2"]))
add_img("/tmp/manual_imgs/manual_04_orders.png")
story.append(PageBreak())

# 3.4 Order Detail
story.append(Paragraph("3.4 Order Detail & Invoice", styles["SubSection"]))
story.append(Paragraph("Click 'View' on any order to see the full detail page:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Status Dropdown</b> — Update order status instantly from the top-right dropdown", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Customer Details</b> — Name, phone, email, age, gender (auto-filled for existing customers)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Order Details</b> — Delivery date, tax %, description/notes", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Items & Measurements</b> — Add multiple items with service type (Blouse, Kurta, Lehenga, etc.), cost, and detailed measurements", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Measurement Tabs</b> — Dynamic tabs for Blouse, Kurta Top, Lehenga, Pant, Kids, Men's Shirt, Men's Pant", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Payments Section</b> — Record payments with date, amount, mode (UPI/Cash). Payments auto-sync to Partnership (UPI → Kshana account, Cash → Cash account)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Invoice</b> — Click 'Invoice' to view/print. Options: Print Invoice, Send via WhatsApp", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_05_order_detail.png")
story.append(Spacer(1, 10))
story.append(Paragraph("Invoice View:", styles["SubSection"]))
add_img("/tmp/manual_imgs/manual_12_invoice.png")
story.append(PageBreak())

# 3.5 Customers
story.append(Paragraph("3.5 Customers Management", styles["SubSection"]))
story.append(Paragraph("Manage all customer accounts. Customers are auto-created when an order is placed.", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Search</b> — Search by name, phone, or email", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Actions</b> — View orders, Reset password, Edit, Delete", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Login Info</b> — Customers login with Name + Password (default password = their phone number)", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_06_customers.png")
story.append(PageBreak())

# 3.6 Employees
story.append(Paragraph("3.6 Employees Management", styles["SubSection"]))
story.append(Paragraph("Track employees, their roles, payment history, and documents:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Roles</b> — Manager, Master, Tailor, Worker", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Pay Types</b> — Hourly, Weekly, Monthly", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Payment Tracking</b> — Total paid, payment count, detailed payment history with dates and notes", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Actions</b> — Pay (record payment), Assign (link to orders), Docs (upload documents), Edit, Delete", styles["BulletItem"]))
story.append(Paragraph("<i>Note: Deleting an employee does NOT delete their outgoing payment records in Partnership.</i>", styles["Note"]))
add_img("/tmp/manual_imgs/manual_07_employees.png")
story.append(PageBreak())

# 3.7 Materials
story.append(Paragraph("3.7 Raw Materials", styles["SubSection"]))
story.append(Paragraph("Track all raw materials purchased for the boutique:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Fields</b> — Material name, description, quantity, cost, purchase date, payment mode, supplier", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Summary</b> — Total items, total spent, number of suppliers", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Actions</b> — Add, Edit, Delete materials", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_08_materials.png")
story.append(PageBreak())

# 3.8 Partnership
story.append(Paragraph("3.8 Partnership & Accounts", styles["SubSection"]))
story.append(Paragraph("The Partnership page is the financial backbone of the boutique, tracking all money in and out:", styles["Body2"]))
story.append(Paragraph("<b>Summary Cards:</b>", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Chandana</b> — Total invested, profit share, total gets", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Akanksha</b> — Total invested, profit share, total gets", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Kshana Account</b> — UPI Income, Cash Income, SBI Outgoing, Balance", styles["BulletItem"]))
story.append(Paragraph("<b>Monthly Settlement Report:</b> Shows month-by-month breakdown of investments, income, SBI outgoing, and profit distribution (50/50 after investment returns).", styles["Body2"]))
story.append(Paragraph("<b>5 Tabs for detailed entries:</b>", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Chandana</b> — All Chandana's investment records", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Akanksha</b> — All Akanksha's investment records", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Kshana (Out)</b> — SBI account outgoing payments (salaries, materials, rent)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Kshana (UPI)</b> — UPI customer payments flowing into the bank. Clickable order links (e.g., #KSH-19)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Cash</b> — Cash payments received from customers", styles["BulletItem"]))
story.append(Paragraph("<b>Auto-Sync:</b> When you record a payment on any order, it automatically creates an income entry here — UPI → Kshana (UPI) tab, Cash → Cash tab.", styles["Body2"]))
add_img("/tmp/manual_imgs/manual_09_partnership.png")
story.append(PageBreak())

# 3.9 Gallery
story.append(Paragraph("3.9 Gallery Management", styles["SubSection"]))
story.append(Paragraph("Manage the boutique's work showcase images:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Upload</b> — Click '+ Upload Image' to add new photos (stored in Cloudinary)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Delete</b> — Click the trash icon on any image to remove it", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Public Display</b> — Gallery images automatically appear on the public landing page carousel", styles["BulletItem"]))
add_img("/tmp/manual_imgs/manual_10_gallery.png")
story.append(PageBreak())

# 3.10 Reviews (text only since no screenshot)
story.append(Paragraph("3.10 Reviews Management", styles["SubSection"]))
story.append(Paragraph("Manage Google Reviews displayed on the landing page:", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Add Review</b> — Enter reviewer name, rating (1-5 stars), review text, date", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Edit/Delete</b> — Modify or remove reviews", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Rating Distribution</b> — Visual graph showing breakdown of 5-star to 1-star reviews", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Auto Display</b> — Reviews appear as testimonials on the public landing page", styles["BulletItem"]))
story.append(PageBreak())

# 3.11 Reports & Export
story.append(Paragraph("3.11 Reports & Export Center", styles["SubSection"]))
story.append(Paragraph("The Export Center (at the bottom of the Dashboard) allows you to download Excel (.xlsx) reports:", styles["Body2"]))
story.append(Paragraph("<b>Available Exports:</b>", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Orders</b> — All orders / Pending / In Progress / Ready / Delivered. Includes order ID, customer, items, total, balance, status", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Employees</b> — Employee details + Salary payments", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Partnership</b> — Chandana / Akanksha / Full Report. All investment and expense records", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Incoming Payments</b> — All customer payments with order ID, amount, date, mode (UPI/Cash)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Outgoing Payments</b> — All expenses from SBI/Kshana account", styles["BulletItem"]))
story.append(PageBreak())

# 3.12 Settings
story.append(Paragraph("3.12 Settings (Password Change with Email Verification)", styles["SubSection"]))
story.append(Paragraph("Change your admin password securely with email verification:", styles["Body2"]))
story.append(Paragraph("<b>Step 1:</b> Enter your current password", styles["Body2"]))
story.append(Paragraph("<b>Step 2:</b> Enter your new password + confirm it", styles["Body2"]))
story.append(Paragraph("<b>Step 3:</b> Click 'Send Verification Code' — a 6-digit code is sent to kshanaconture@gmail.com", styles["Body2"]))
story.append(Paragraph("<b>Step 4:</b> Enter the code and click 'Verify & Update'", styles["Body2"]))
story.append(Paragraph("<i>Note: The code expires in 10 minutes. You can click 'Resend code' if needed.</i>", styles["Note"]))
add_img("/tmp/manual_imgs/manual_11_settings.png")
story.append(PageBreak())

# 4. Customer Portal
story.append(Paragraph("4. Customer Portal", styles["SectionTitle"]))
story.append(Paragraph("Customers can access their personal portal to track orders:", styles["Body2"]))
story.append(Paragraph("<b>Login:</b> From the landing page, click LOGIN → Customer Login", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Name</b> — Customer's name (as registered)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Password</b> — Default is their phone number (can be reset by admin)", styles["BulletItem"]))
story.append(Paragraph("<b>Customer Dashboard Features:</b>", styles["Body2"]))
story.append(Paragraph("<bullet>&bull;</bullet> View all their orders with status, delivery dates, and payment details", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> See payment history for each order", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> View boutique gallery", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Quick contact via WhatsApp", styles["BulletItem"]))
story.append(PageBreak())

# 5. Quick Reference
story.append(Paragraph("5. Quick Reference", styles["SectionTitle"]))

story.append(Paragraph("Login Credentials:", styles["SubSection"]))
story.append(Paragraph("Admin Phone: 9187202605", styles["Cred"]))
story.append(Paragraph("Admin Password: admin123", styles["Cred"]))
story.append(Spacer(1, 5))
story.append(Paragraph("Customer (Vishala) Name: Vishala", styles["Cred"]))
story.append(Paragraph("Customer (Vishala) Password: 9980868408", styles["Cred"]))
story.append(Spacer(1, 15))

story.append(Paragraph("Key Workflows:", styles["SubSection"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Create Order:</b> Dashboard → New Order → Fill customer (autocomplete) → Add items → Set delivery date → Record advance → Save", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Record Payment:</b> Orders → View order → Scroll to Payments → Enter amount, date, mode → Record. Auto-syncs to Partnership.", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Update Status:</b> Dashboard (click status pill) OR Order detail page (top-right dropdown)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Generate Invoice:</b> Orders → Invoice button → Print Invoice or Send via WhatsApp", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Export Reports:</b> Dashboard → Scroll to Export Center → Click the report you need", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> <b>Change Password:</b> Settings → Enter current password → New password → Send code → Enter code → Update", styles["BulletItem"]))
story.append(Spacer(1, 20))

story.append(Paragraph("Important Notes:", styles["SubSection"]))
story.append(Paragraph("<bullet>&bull;</bullet> All payments recorded on orders auto-sync to Partnership income (UPI → Kshana account, Cash → Cash)", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Deleting an employee does NOT delete their partnership/outgoing records", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Gallery images are stored in Cloudinary — ensure CLOUDINARY_URL is configured on Render", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Email verification for password change requires GMAIL_APP_PASSWORD in Render environment", styles["BulletItem"]))
story.append(Paragraph("<bullet>&bull;</bullet> Order IDs are sequential: KSH-01, KSH-02, ... KSH-64, etc.", styles["BulletItem"]))
story.append(Spacer(1, 40))
story.append(Paragraph("~ End of Manual ~", ParagraphStyle(name="End", fontName="Times-Italic", fontSize=12, textColor=HexColor("#8A7D76"), alignment=TA_CENTER)))

doc.build(story)
print("PDF manual generated: /app/Kshana_Contour_Manual.pdf")
