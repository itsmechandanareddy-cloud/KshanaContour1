# Kshana Contour — Complete Deployment Guide (100% Free)
# Follow Each Step Exactly — Don't Skip Anything

---

## OVERVIEW
```
Your Website = Vercel (Frontend) + Render (Backend) + MongoDB Atlas (Database) + Cloudinary (Images)
All 4 are FREE. You only pay for your domain name.
```

---

## PART 1: CREATE MONGODB ATLAS DATABASE (10 minutes)

### Step 1.1: Create Account
1. Open your browser and go to: **https://www.mongodb.com/cloud/atlas/register**
2. Sign up with your **Google account** or **email**
3. If asked "What are you building?" → Select **"I'm just exploring"**
4. Click **Continue**

### Step 1.2: Create Free Cluster
1. You'll see "Deploy your database" screen
2. Select **M0 FREE** (the free option)
3. Provider: Select **AWS**
4. Region: Select **Mumbai (ap-south-1)** (closest to India)
5. Cluster Name: Leave as `Cluster0`
6. Click **Create Deployment**

### Step 1.3: Create Database User
1. A popup will say "Connect to Cluster0"
2. Under **"Create a Database User"**:
   - Username: type `kshana_admin`
   - Password: Click **"Autogenerate Secure Password"**
   - **COPY THE PASSWORD AND SAVE IT IN NOTEPAD** — you'll need this later!
3. Click **Create Database User**

### Step 1.4: Allow Network Access
1. In the same popup, under "Where would you like to connect from?"
2. Select **"My Local Environment"**
3. In the IP Address field, type: `0.0.0.0/0`
4. Description: type `Allow All`
5. Click **Add Entry**
6. Click **Choose a connection method**

### Step 1.5: Get Connection String
1. Select **"Drivers"**
2. You'll see a connection string like:
   ```
   mongodb+srv://kshana_admin:<db_password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
3. **COPY THIS ENTIRE STRING**
4. Open Notepad and paste it
5. Replace `<db_password>` with the password you saved in Step 1.3
6. Add the database name before the `?`:
   ```
   mongodb+srv://kshana_admin:YOUR_PASSWORD@cluster0.abc123.mongodb.net/kshana_boutique?retryWrites=true&w=majority
   ```
7. **SAVE THIS IN NOTEPAD** — label it "MONGO_URL"

---

## PART 2: CREATE CLOUDINARY ACCOUNT (5 minutes)

### Step 2.1: Create Account
1. Go to: **https://cloudinary.com/users/register_free**
2. Sign up with **Google** or **email**
3. When asked "What's your primary interest?" → Select **"Programmable Media"**
4. Cloud name: type `kshana` (or any short name)
5. Click **Create Account**

### Step 2.2: Get Your Cloudinary URL
1. After signup, you'll be on the **Dashboard**
2. You'll see a box that says **"API Environment variable"**
3. It shows something like:
   ```
   CLOUDINARY_URL=cloudinary://123456789012345:ABCDefgh-ijklMNOP@kshana
   ```
4. **COPY the part AFTER the `=` sign** (starting with `cloudinary://...`)
5. **SAVE THIS IN NOTEPAD** — label it "CLOUDINARY_URL"

---

## PART 3: DEPLOY BACKEND ON RENDER (15 minutes)

### Step 3.1: Create Render Account
1. Go to: **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with your **GitHub account** (this is important — use the same GitHub where you saved the code)

### Step 3.2: Create Web Service
1. After login, click the **"New +"** button at the top
2. Select **"Web Service"**
3. Select **"Build and deploy from a Git repository"** → Click **Next**
4. You'll see your GitHub repos listed
5. Find **KshanaContour** (or whatever you named it) → Click **Connect**

### Step 3.3: Configure the Service
Fill in these EXACT values:

| Field | Value |
|-------|-------|
| **Name** | `kshana-contour-api` |
| **Region** | `Singapore (Southeast Asia)` or closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |

### Step 3.4: Select Free Plan
1. Scroll down to **"Instance Type"**
2. Select **"Free"** ($0/month)

### Step 3.5: Add Environment Variables
1. Scroll down to **"Environment Variables"**
2. Click **"Add Environment Variable"** for EACH of these (one by one):

| Key | Value |
|-----|-------|
| `MONGO_URL` | *(paste the MongoDB connection string from Part 1, Step 1.5)* |
| `DB_NAME` | `kshana_boutique` |
| `JWT_SECRET` | `kshana_contour_boutique_secret_key_2024_secure_jwt_token` |
| `ADMIN_PHONE` | `9187202605` |
| `ADMIN_PASSWORD` | `admin123` |
| `CLOUDINARY_URL` | *(paste the Cloudinary URL from Part 2, Step 2.2)* |
| `CORS_ORIGINS` | `*` |

⚠️ **Double-check**: Make sure there are NO extra spaces before or after any value!

### Step 3.6: Deploy
1. Click **"Create Web Service"**
2. Render will start building your backend — this takes **5-10 minutes**
3. You'll see logs scrolling — wait until you see **"Your service is live"**
4. At the top, you'll see your backend URL like:
   ```
   https://kshana-contour-api.onrender.com
   ```
5. **COPY THIS URL AND SAVE IN NOTEPAD** — label it "BACKEND_URL"

### Step 3.7: Test Your Backend
1. Open a new browser tab
2. Go to: `https://kshana-contour-api.onrender.com/docs`
3. If you see the FastAPI documentation page → **Backend is working!**
4. If you see an error → wait 2 more minutes and refresh

---

## PART 4: DEPLOY FRONTEND ON VERCEL (10 minutes)

### Step 4.1: Create Vercel Account
1. Go to: **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub

### Step 4.2: Import Project
1. Click **"Add New..."** → **"Project"**
2. You'll see your GitHub repos
3. Find **KshanaContour** → Click **"Import"**

### Step 4.3: Configure Project
1. **Framework Preset**: Should auto-detect as `Create React App`. If not, select it.
2. **Root Directory**: Click **"Edit"** → type `frontend` → Click the checkmark to save
3. **Build Command**: Leave as default (`yarn build` or `react-scripts build`)
4. **Output Directory**: Leave as default (`build`)

### Step 4.4: Add Environment Variable
1. Click **"Environment Variables"** to expand it
2. Add ONE variable:

| Key | Value |
|-----|-------|
| `REACT_APP_BACKEND_URL` | *(paste the Render backend URL from Part 3, Step 3.6)* |

⚠️ **CRITICAL**: 
- The URL must start with `https://`
- The URL must NOT end with `/`
- Example: `https://kshana-contour-api.onrender.com`
- NOT: `https://kshana-contour-api.onrender.com/`

### Step 4.5: Deploy
1. Click **"Deploy"**
2. Wait **2-3 minutes** for the build to complete
3. You'll see a **"Congratulations!"** screen with a preview of your site
4. Click **"Visit"** to see your live website!
5. Your URL will be like: `https://kshana-contour-XXXX.vercel.app`

---

## PART 5: TEST EVERYTHING (5 minutes)

### Test 1: Open your Vercel website
1. Go to your Vercel URL (e.g., `https://kshana-contour.vercel.app`)
2. You should see the Kshana Contour landing page

### Test 2: Admin Login
1. Click **Admin Login** on the landing page
2. Phone: `9187202605`
3. Password: `admin123`
4. You should see the Admin Dashboard

### Test 3: Customer Login
1. Go back to landing page → **Customer Login**
2. Name: `Vishala`
3. Password: `9876543211`
4. If this is a fresh database, you'll need to create an order first for this customer

### Test 4: Create an Order
1. Login as Admin
2. Go to Orders → New Order
3. Fill in customer details and create
4. Verify the order appears in the list

---

## PART 6: ADD CUSTOM DOMAIN (5 minutes)

### Step 6.1: Add Domain to Vercel
1. Go to **Vercel Dashboard** → Click your project
2. Go to **Settings** → **Domains**
3. Type your domain (e.g., `kshanacontour.com`) → Click **Add**
4. Vercel will show you DNS records to add

### Step 6.2: Update DNS at Your Domain Provider
1. Go to where you bought your domain (GoDaddy, Namecheap, etc.)
2. Go to **DNS Settings** or **DNS Management**
3. Add the records Vercel shows you:
   - Usually an **A record** pointing to `76.76.21.21`
   - And a **CNAME record** for `www` pointing to `cname.vercel-dns.com`
4. Save and wait **5-30 minutes** for DNS to propagate

### Step 6.3: Verify
1. Go back to Vercel → Domains
2. You should see a green checkmark next to your domain
3. Visit `https://kshanacontour.com` — your site is live!

---

## IMPORTANT NOTES

### Render Free Tier Sleeps
- The free Render backend **sleeps after 15 minutes of no activity**
- When someone visits after it sleeps, the **first load takes 30-50 seconds**
- After that, it stays fast for 15 minutes
- **To fix this**: Upgrade Render to paid ($7/month) for always-on
- **Free workaround**: Use a free cron service like https://cron-job.org to ping your backend URL every 14 minutes

### Keeping It Free Forever
- Vercel free: 100GB bandwidth/month (more than enough)
- Render free: Sleeps after 15 min inactivity
- MongoDB Atlas free: 512MB storage (enough for 10,000+ orders)
- Cloudinary free: 25GB storage (enough for thousands of images)

### Your Saved Values (Keep These Safe!)
```
MONGO_URL = mongodb+srv://kshana_admin:PASSWORD@cluster0.xxx.mongodb.net/kshana_boutique?retryWrites=true&w=majority
DB_NAME = kshana_boutique
JWT_SECRET = kshana_contour_boutique_secret_key_2024_secure_jwt_token
ADMIN_PHONE = 9187202605
ADMIN_PASSWORD = admin123
CLOUDINARY_URL = cloudinary://KEY:SECRET@CLOUD_NAME
BACKEND_URL = https://kshana-contour-api.onrender.com
```
