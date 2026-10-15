import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ProductsPage from '../features/products/ProductsPage';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import Navbar from '../components/layout/Navbar';
import CommunityPage from '../features/community/CommunityPage';
import AdminPage from '../features/community/AdminPage';
import FeedPage from '../features/community/FeedPage';
import PatientAppointmentsPage from '../features/community/AppointmentBookingPage';
import DoctorDashboardPage from '../features/community/DoctorDashboardPage';
import { useSelector } from 'react-redux';

const AppLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

const RoleRoute = ({ roles, children }) => {
  const user = useSelector((state) => state.auth.user);
  return roles.includes(user?.role) ? children : <Navigate to="/products" replace />;
};

const HomeRedirect = () => {
  const user = useSelector((state) => state.auth.user);
  const home = user?.role === 'doctor'
    ? '/doctor'
    : user?.role === 'patient'
      ? '/appointments'
      : '/products';
  return <Navigate to={home} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/feed"
          element={
            <AppLayout>
              <FeedPage />
            </AppLayout>
          }
        />
        <Route
          path="/appointments"
          element={
            <RoleRoute roles={['patient']}>
              <AppLayout><PatientAppointmentsPage /></AppLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <RoleRoute roles={['doctor']}>
              <AppLayout><DoctorDashboardPage /></AppLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/products"
          element={
            <AppLayout>
              <ProductsPage />
            </AppLayout>
          }
        />
        <Route
          path="/messages"
          element={
            <AppLayout>
              <CommunityPage />
            </AppLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <AppLayout>
              <AdminPage />
            </AppLayout>
          }
        />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
