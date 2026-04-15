# Kshana Contour — Deployment Guide (Vercel + Render + MongoDB Atlas + Cloudinary)

## Architecture

```
User → Vercel (React Frontend) → Render (FastAPI Backend) → MongoDB Atlas (Database)
                                                           → Cloudinary (Image Storage)
```

---

## STEP 1: MongoDB Atlas (Free Database)

1. Go to **https://www.mongodb.com/cloud/atlas** → Sign Up (free)
2. Create a **free M0 cluster** (512MB, enough for boutique)
3. Choose region closest to you (e.g., Mumbai for India)
4. Under **Database Access** → Add Database User:
   - Username: `kshana_admin`
   - Password: (auto-generate, copy it!)
5. Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
6. Click **Connect** → **Connect your application** → Copy the connection string
7. Replace `<password>` with your actual password:
   ```
   mongodb+srv://kshana_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kshana_boutique?retryWrites=true&w=majority
   ```
   **Save this — this is your `MONGO_URL`**

---

## STEP 2: Cloudinary (Free Image Storage)

1. Go to **https://cloudinary.com** → Sign Up (free — 25GB storage)
2. After signup, go to **Dashboard**
3. You'll see: Cloud Name, API Key, API Secret
4. Your `CLOUDINARY_URL` is:
   ```
   cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ```
   Example: `cloudinary://123456789012345:abcdefghijklmnop@my-cloud-name`
   **Save this — this is your `CLOUDINARY_URL`**

---

## STEP 3: Deploy Backend on Render (Free)

1. Go to **https://render.com** → Sign Up (free)
2. Click **New** → **Web Service**
3. Connect your **GitHub repo** (the one you saved from Emergent)
4. Configure:
   - **Name**: `kshana-contour-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. Add **Environment Variables** (click "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | `mongodb+srv://kshana_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kshana_boutique?retryWrites=true&w=majority` |
   | `DB_NAME` | `kshana_boutique` |
   | `JWT_SECRET` | `kshana_contour_boutique_secret_key_2024_secure_jwt_token` |
   | `ADMIN_PHONE` | `9187202605` |
   | `ADMIN_PASSWORD` | `admin123` |
   | `CLOUDINARY_URL` | `cloudinary://YOUR_KEY:YOUR_SECRET@YOUR_CLOUD` |
   | `CORS_ORIGINS` | `*` |

6. Click **Create Web Service**
7. Wait for deployment (5-10 mins). You'll get a URL like:
   ```
   https://kshana-contour-api.onrender.com
   ```
   **Save this — this is your backend URL**

---

## STEP 4: Deploy Frontend on Vercel

1. Go to **https://vercel.com** → Sign Up / Login
2. Click **Add New** → **Project**
3. Import your **GitHub repo**
4. Configure:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: Click **Edit** → type `frontend`
   - **Build Command**: `yarn build` (should auto-detect)
   - **Output Directory**: `build`

5. Add **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_BACKEND_URL` | `https://kshana-contour-api.onrender.com` |

   ⚠️ **Important**: Use your Render backend URL from Step 3 — NO trailing slash!

6. Click **Deploy**
7. Wait 2-3 minutes. You'll get a URL like:
   ```
   https://kshana-contour.vercel.app
   ```

---

## STEP 5: Seed Your Database

After both services are running, seed the admin account:

Open your browser and visit:
```
https://kshana-contour-api.onrender.com/api/auth/admin/login
```

The admin account is auto-created on first startup. Test login:
```
Phone: 9187202605
Password: admin123
```

If you want to seed sample data, you can run the seed script locally:
```bash
cd backend
MONGO_URL="mongodb+srv://kshana_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kshana_boutique" DB_NAME="kshana_boutique" python seed_data.py
```

---

## STEP 6: Update CORS (Optional but Recommended)

After deployment, update the `CORS_ORIGINS` on Render to only allow your Vercel domain:
```
https://kshana-contour.vercel.app
```

---

## Environment Variables Summary

### Backend (Render)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `DB_NAME` | Database name | `kshana_boutique` |
| `JWT_SECRET` | Secret for JWT tokens | Any long random string |
| `ADMIN_PHONE` | Admin phone number | `9187202605` |
| `ADMIN_PASSWORD` | Admin password | `admin123` |
| `CLOUDINARY_URL` | Cloudinary connection | `cloudinary://key:secret@cloud` |
| `CORS_ORIGINS` | Allowed frontend origins | `*` or your Vercel URL |

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `https://kshana-contour-api.onrender.com` |

---

## Troubleshooting

### "Storage not configured" error
→ Make sure `CLOUDINARY_URL` is set in Render environment variables

### Login not working
→ The admin account auto-creates on first startup. Visit any API endpoint to trigger startup.

### CORS errors
→ Set `CORS_ORIGINS` to `*` or your exact Vercel URL

### Images not loading
→ Check Cloudinary dashboard for uploaded files. Ensure `CLOUDINARY_URL` is correct.

### MongoDB connection failed
→ Check Atlas: Network Access must include `0.0.0.0/0`, and DB user credentials are correct

### Render free tier sleeps
→ Render free tier services sleep after 15 mins of inactivity. First request takes ~30s to wake up. Upgrade to paid ($7/mo) for always-on.

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `kshanacontour.com`)
3. Update DNS records as Vercel instructs

### Render
1. Go to Service Settings → Custom Domain
2. Add your API subdomain (e.g., `api.kshanacontour.com`)
3. Update DNS records as Render instructs
4. Update `REACT_APP_BACKEND_URL` on Vercel to use the new domain

---

## Cost Summary (Free Tier)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/mo | $20/mo |
| Render | 750 hrs/mo (sleeps after 15min) | $7/mo always-on |
| MongoDB Atlas | 512MB storage | $9/mo for 2GB |
| Cloudinary | 25GB storage, 25K transforms | $99/mo for 25GB+ |

**Total: $0/month** on free tiers (with Render sleep limitation)
