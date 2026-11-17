import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { homeFor } from './roles.js';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ComingSoon from '../pages/ComingSoon.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage.jsx';
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import StudentsPage from '../pages/admin/StudentsPage.jsx';
import StudentAdmissionPage from '../pages/admin/StudentAdmissionPage.jsx';
import StudentProfilePage from '../pages/admin/StudentProfilePage.jsx';
import TeachersPage from '../pages/admin/TeachersPage.jsx';
import TeacherFormPage from '../pages/admin/TeacherFormPage.jsx';
import TeacherProfilePage from '../pages/admin/TeacherProfilePage.jsx';
import AcademicsPage from '../pages/admin/AcademicsPage.jsx';
import AdminAttendancePage from '../pages/admin/AdminAttendancePage.jsx';
import TeacherAttendancePage from '../pages/teacher/TeacherAttendancePage.jsx';
import StudentAttendancePage from '../pages/student/StudentAttendancePage.jsx';
import ParentAttendancePage from '../pages/parent/ParentAttendancePage.jsx';
import AdminExamsPage from '../pages/admin/AdminExamsPage.jsx';
import TeacherMarksPage from '../pages/teacher/TeacherMarksPage.jsx';
import ResultsPage from '../pages/student/ResultsPage.jsx';
import ParentResultsPage from '../pages/parent/ParentResultsPage.jsx';
import '../styles/admin.css';
import '../styles/attendance.css';
import '../styles/exams.css';
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
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/new" element={<StudentAdmissionPage />} />
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="teachers/new" element={<TeacherFormPage />} />
        <Route path="teachers/:id" element={<TeacherProfilePage />} />
        <Route path="classes" element={<AcademicsPage />} />
        <Route path="attendance" element={<AdminAttendancePage />} />
        <Route path="examinations" element={<AdminExamsPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['teacher']}>
            <DashboardLayout role="teacher" />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendancePage />} />
        <Route path="marks" element={<TeacherMarksPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute roles={['student']}>
            <DashboardLayout role="student" />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="results" element={<ResultsPage title="My results" />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/parent"
        element={
          <ProtectedRoute roles={['parent']}>
            <DashboardLayout role="parent" />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboard />} />
        <Route path="attendance" element={<ParentAttendancePage />} />
        <Route path="results" element={<ParentResultsPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
