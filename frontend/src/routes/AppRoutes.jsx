import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { homeFor } from './roles.js';
import LoginPage from '../pages/auth/LoginPage.jsx';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage.jsx';
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import TeacherDashboard from '../pages/teacher/TeacherDashboard.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import ParentDashboard from '../pages/parent/ParentDashboard.jsx';

function RootRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    );
  }
  if (status !== 'authenticated' || !user) return <Navigate to="/login" replace />;
  return <Navigate to={user.mustChangePassword ? '/change-password' : homeFor(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute roles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/*"
        element={
          <ProtectedRoute roles={['parent']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
