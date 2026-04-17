import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import AdminLogin from "./pages/AdminLogin";
import CustomerLogin from "./pages/CustomerLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/Orders";
import AdminOrderForm from "./pages/admin/OrderForm";
import AdminEmployees from "./pages/admin/Employees";
import AdminMaterials from "./pages/admin/Materials";
import AdminReports from "./pages/admin/Reports";
import AdminGallery from "./pages/admin/Gallery";
import AdminReviewsContact from "./pages/admin/ReviewsContact";
import AdminInvoice from "./pages/admin/Invoice";
import AdminPartnership from "./pages/admin/Partnership";
import AdminCustomers from "./pages/admin/Customers";
import AdminSettings from "./pages/admin/Settings";
import CustomerHome from "./pages/customer/Home";
import CustomerOrders from "./pages/customer/MyOrders";
import CustomerOrderDetail from "./pages/customer/OrderDetail";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: false
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password, isAdmin = true) => {
    try {
      const endpoint = isAdmin ? "/auth/admin/login" : "/auth/customer/login";
      const payload = isAdmin 
        ? { phone: identifier, password } 
        : { name: identifier, password };
      
      const response = await axios.post(`${API}${endpoint}`, payload, {
        withCredentials: false
      });
      
      const userData = response.data;
      localStorage.setItem("token", userData.token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const msg = error.response?.data?.detail || "Login failed";
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: false });
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    setUser(null);
  };

  // Auto-logout after 1 hour of inactivity
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms

  const updateActivity = useCallback(() => {
    if (user) localStorage.setItem("lastActivity", Date.now().toString());
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem("lastActivity", Date.now().toString());
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, updateActivity));

    const interval = setInterval(() => {
      const last = parseInt(localStorage.getItem("lastActivity") || "0");
      if (last && Date.now() - last > INACTIVITY_TIMEOUT) {
        logout();
        window.location.href = "/";
      }
    }, 30000); // check every 30 seconds

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [user, updateActivity]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Global axios interceptor - auto logout on 401 (token expired)
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("lastActivity");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C05C3B] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    const redirectTo = role === "admin" ? "/admin/login" : "/login";
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Customer Routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute role="customer">
                <CustomerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/orders"
            element={
              <ProtectedRoute role="customer">
                <CustomerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/orders/:orderId"
            element={
              <ProtectedRoute role="customer">
                <CustomerOrderDetail />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute role="admin">
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders/new"
            element={
              <ProtectedRoute role="admin">
                <AdminOrderForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders/:orderId"
            element={
              <ProtectedRoute role="admin">
                <AdminOrderForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/invoice/:orderId"
            element={
              <ProtectedRoute role="admin">
                <AdminInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/partnership"
            element={
              <ProtectedRoute role="admin">
                <AdminPartnership />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute role="admin">
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/materials"
            element={
              <ProtectedRoute role="admin">
                <AdminMaterials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gallery"
            element={
              <ProtectedRoute role="admin">
                <AdminGallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <ProtectedRoute role="admin">
                <AdminReviewsContact />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute role="admin">
                <AdminCustomers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="admin">
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
