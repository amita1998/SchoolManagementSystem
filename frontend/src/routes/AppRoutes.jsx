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
import AdminFeesPage from '../pages/admin/AdminFeesPage.jsx';
import LibraryPage from '../pages/admin/LibraryPage.jsx';
import StudentLibraryPage from '../pages/student/StudentLibraryPage.jsx';
import TeacherLibraryPage from '../pages/teacher/TeacherLibraryPage.jsx';
import ParentLibraryPage from '../pages/parent/ParentLibraryPage.jsx';
import ParentFeesPage from '../pages/parent/ParentFeesPage.jsx';
import StudentFeesPage from '../pages/student/StudentFeesPage.jsx';
import AdminEventsPage from '../pages/admin/AdminEventsPage.jsx';
import TeacherEventsPage from '../pages/teacher/TeacherEventsPage.jsx';
import AdminNoticesPage from '../pages/admin/AdminNoticesPage.jsx';
import TeacherNoticesPage from '../pages/teacher/TeacherNoticesPage.jsx';
import StudentNoticesPage from '../pages/student/StudentNoticesPage.jsx';
import ParentNoticesPage from '../pages/parent/ParentNoticesPage.jsx';
import AdminTimetablePage from '../pages/admin/AdminTimetablePage.jsx';
import TeacherTimetablePage from '../pages/teacher/TeacherTimetablePage.jsx';
import TeacherClassesPage from '../pages/teacher/TeacherClassesPage.jsx';
import TeacherStudentsPage from '../pages/teacher/TeacherStudentsPage.jsx';
import ParentChildrenPage from '../pages/parent/ParentChildrenPage.jsx';
import StudentTimetablePage from '../pages/student/StudentTimetablePage.jsx';
import ParentTimetablePage from '../pages/parent/ParentTimetablePage.jsx';
import TeacherAssignmentsPage from '../pages/teacher/TeacherAssignmentsPage.jsx';
import StudentAssignmentsPage from '../pages/student/StudentAssignmentsPage.jsx';
import ParentAssignmentsPage from '../pages/parent/ParentAssignmentsPage.jsx';
import StudentEventsPage from '../pages/student/StudentEventsPage.jsx';
import ParentEventsPage from '../pages/parent/ParentEventsPage.jsx';
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx';
import AdminAuditPage from '../pages/admin/AdminAuditPage.jsx';
import '../styles/admin.css';
import '../styles/attendance.css';
import '../styles/exams.css';
import '../styles/fees.css';
import '../styles/comms.css';
// The shared component layer loads last on purpose: it owns the bare selectors
// (cards, tables, forms, buttons, badges) and must win over the legacy page CSS.
import '../styles/ui.css';
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
        <Route path="fees" element={<AdminFeesPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="announcements" element={<AdminNoticesPage />} />
        <Route path="timetable" element={<AdminTimetablePage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
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
        <Route path="classes" element={<TeacherClassesPage />} />
        <Route path="students" element={<TeacherStudentsPage />} />
        <Route path="attendance" element={<TeacherAttendancePage />} />
        <Route path="marks" element={<TeacherMarksPage />} />
        <Route path="library" element={<TeacherLibraryPage />} />
        <Route path="assignments" element={<TeacherAssignmentsPage />} />
        <Route path="timetable" element={<TeacherTimetablePage />} />
        <Route path="events" element={<TeacherEventsPage />} />
        <Route path="notices" element={<TeacherNoticesPage />} />
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
        <Route path="assignments" element={<StudentAssignmentsPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="events" element={<StudentEventsPage />} />
        <Route path="notices" element={<StudentNoticesPage />} />
        <Route path="fees" element={<StudentFeesPage />} />
        <Route path="library" element={<StudentLibraryPage />} />
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
        <Route path="children" element={<ParentChildrenPage />} />
        <Route path="attendance" element={<ParentAttendancePage />} />
        <Route path="results" element={<ParentResultsPage />} />
        <Route path="fees" element={<ParentFeesPage />} />
        <Route path="library" element={<ParentLibraryPage />} />
        <Route path="assignments" element={<ParentAssignmentsPage />} />
        <Route path="timetable" element={<ParentTimetablePage />} />
        <Route path="events" element={<ParentEventsPage />} />
        <Route path="notices" element={<ParentNoticesPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
