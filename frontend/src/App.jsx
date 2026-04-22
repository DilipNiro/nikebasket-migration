// src/App.jsx — Routeur principal
// React Router v6 avec layout imbriqué (AdminLayout)

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import ProtectedRoute  from './components/ProtectedRoute';

import Home            from './pages/Home';
import Products        from './pages/Products';
import ProductDetail   from './pages/ProductDetail';
import Cart            from './pages/Cart';
import Checkout        from './pages/Checkout';
import Login           from './pages/Login';
import Register        from './pages/Register';
import Orders          from './pages/Orders';
import OrderDetail     from './pages/OrderDetail';
import Profile         from './pages/Profile';
import ChangePassword  from './pages/ChangePassword';
import ForgotPassword  from './pages/ForgotPassword';
import ResetPassword   from './pages/ResetPassword';
import AdminLayout     from './pages/admin/AdminLayout';
import Dashboard       from './pages/admin/Dashboard';
import AdminProducts   from './pages/admin/Products';
import AdminOrders     from './pages/admin/Orders';
import AdminUsers      from './pages/admin/Users';
import AdminStock      from './pages/admin/Stock';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Navbar />
          <Routes>
            {/* Routes publiques */}
            <Route path="/"             element={<Home />} />
            <Route path="/products"     element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login"            element={<Login />} />
            <Route path="/register"         element={<Register />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />

            {/* Routes protégées (connecté) */}
            <Route path="/cart"            element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/checkout"        element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders"          element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id"      element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

            {/* Panel admin (admin + employé) — layout imbriqué */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index         element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders"   element={<AdminOrders />} />
              <Route path="users"    element={<AdminUsers />} />
              <Route path="stock"    element={<AdminStock />} />
            </Route>
          </Routes>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
