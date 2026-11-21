import { PERMISSIONS as P } from '../services/permissions.js';

/**
 * Sidebar navigation. Every entry carries the permission that justifies it, so the
 * menu is filtered exactly like the API. `step` is only used to explain, on the
 * placeholder page, which build step brings the module — never to fake a screen.
 */
export const NAVIGATION = {
  admin: [
    { label: 'Dashboard', to: '/admin', icon: 'bi-house-door', end: true },
    { label: 'Students', to: '/admin/students', icon: 'bi-people', permission: P.STUDENT_VIEW_ALL, step: 4 },
    { label: 'Teachers', to: '/admin/teachers', icon: 'bi-person-video3', permission: P.TEACHER_VIEW_ALL, step: 4 },
    { label: 'Classes', to: '/admin/classes', icon: 'bi-grid-3x3-gap', permission: P.ACADEMIC_MANAGE, step: 4 },
    { label: 'Attendance', to: '/admin/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_VIEW_ALL, step: 5 },
    { label: 'Examinations', to: '/admin/examinations', icon: 'bi-journal-text', permission: P.EXAM_MANAGE, step: 6 },
    { label: 'Fees', to: '/admin/fees', icon: 'bi-receipt', permission: P.FEE_MANAGE },
    { label: 'Library', to: '/admin/library', icon: 'bi-book', permission: P.LIBRARY_MANAGE },
    { label: 'Leave', to: '/admin/leave', icon: 'bi-calendar2-x', permission: P.LEAVE_APPROVE },
    { label: 'Meetings', to: '/admin/ptm', icon: 'bi-people', permission: P.PTM_MANAGE },
    { label: 'Events', to: '/admin/events', icon: 'bi-calendar-event', permission: P.EVENT_MANAGE },
    { label: 'Announcements', to: '/admin/announcements', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_MANAGE },
    { label: 'Timetable', to: '/admin/timetable', icon: 'bi-table', permission: P.TIMETABLE_MANAGE },
    { label: 'Reports', to: '/admin/reports', icon: 'bi-file-earmark-bar-graph', permission: P.REPORT_VIEW_ALL },
    { label: 'Settings', to: '/admin/settings', icon: 'bi-gear', permission: P.SETTINGS_MANAGE },
    { label: 'Audit log', to: '/admin/audit', icon: 'bi-shield-check', permission: P.AUDIT_VIEW },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher', icon: 'bi-house-door', end: true },
    { label: 'My Classes', to: '/teacher/classes', icon: 'bi-grid-3x3-gap', permission: P.STUDENT_VIEW_ASSIGNED },
    { label: 'Students', to: '/teacher/students', icon: 'bi-people', permission: P.STUDENT_VIEW_ASSIGNED },
    { label: 'Attendance', to: '/teacher/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_MARK, step: 5 },
    { label: 'Marks', to: '/teacher/marks', icon: 'bi-journal-check', permission: P.MARKS_ENTER, step: 6 },
    { label: 'Library', to: '/teacher/library', icon: 'bi-book', permission: P.LIBRARY_VIEW_OWN },
    { label: 'Leave', to: '/teacher/leave', icon: 'bi-calendar2-x', permission: P.LEAVE_APPLY },
    { label: 'Meetings', to: '/teacher/ptm', icon: 'bi-people', permission: P.PTM_VIEW_OWN },
    { label: 'Assignments', to: '/teacher/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_MANAGE },
    { label: 'Timetable', to: '/teacher/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW },
    { label: 'Events', to: '/teacher/events', icon: 'bi-calendar-event', permission: P.EVENT_VIEW },
    { label: 'Notices', to: '/teacher/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW },
  ],
  student: [
    { label: 'Dashboard', to: '/student', icon: 'bi-house-door', end: true },
    { label: 'My Attendance', to: '/student/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_VIEW_OWN, step: 5 },
    { label: 'Results', to: '/student/results', icon: 'bi-journal-text', permission: P.RESULT_VIEW_OWN, step: 6 },
    { label: 'Fees', to: '/student/fees', icon: 'bi-receipt', permission: P.FEE_VIEW_OWN },
    { label: 'Library', to: '/student/library', icon: 'bi-book', permission: P.LIBRARY_VIEW_OWN },
    { label: 'Leave', to: '/student/leave', icon: 'bi-calendar2-x', permission: P.LEAVE_APPLY },
    { label: 'Meetings', to: '/student/ptm', icon: 'bi-people', permission: P.PTM_VIEW_OWN },
    { label: 'Assignments', to: '/student/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_VIEW },
    { label: 'Timetable', to: '/student/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW },
    { label: 'Events', to: '/student/events', icon: 'bi-calendar-event', permission: P.EVENT_VIEW },
    { label: 'Notices', to: '/student/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW },
  ],
  parent: [
    { label: 'Dashboard', to: '/parent', icon: 'bi-house-door', end: true },
    { label: 'My Children', to: '/parent/children', icon: 'bi-people', permission: P.STUDENT_VIEW_CHILDREN },
    { label: 'Attendance', to: '/parent/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_VIEW_CHILDREN, step: 5 },
    { label: 'Results', to: '/parent/results', icon: 'bi-journal-text', permission: P.RESULT_VIEW_CHILDREN, step: 6 },
    { label: 'Fees', to: '/parent/fees', icon: 'bi-receipt', permission: P.FEE_VIEW_CHILDREN },
    { label: 'Library', to: '/parent/library', icon: 'bi-book', permission: P.LIBRARY_VIEW_CHILDREN },
    { label: 'Leave', to: '/parent/leave', icon: 'bi-calendar2-x', permission: P.LEAVE_APPLY },
    { label: 'Meetings', to: '/parent/ptm', icon: 'bi-people', permission: P.PTM_BOOK },
    { label: 'Assignments', to: '/parent/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_VIEW },
    { label: 'Timetable', to: '/parent/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW },
    { label: 'Events', to: '/parent/events', icon: 'bi-calendar-event', permission: P.EVENT_VIEW },
    { label: 'Notices', to: '/parent/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW },
  ],
};

export function navigationFor(role) {
  return NAVIGATION[role] || [];
}

export default NAVIGATION;
