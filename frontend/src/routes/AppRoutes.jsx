import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ProductsPage from '../features/products/ProductsPage';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import Navbar from '../components/layout/Navbar';

const AppLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/products"
          element={
            <AppLayout>
              <ProductsPage />
            </AppLayout>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/products" replace />} />
      <Route path="*" element={<Navigate to="/products" replace />} />
    </Routes>
  );
};

export default AppRoutes;
