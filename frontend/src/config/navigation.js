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
    { label: 'Fees', to: '/admin/fees', icon: 'bi-receipt', permission: P.FEE_MANAGE, step: 7 },
    { label: 'Events', to: '/admin/events', icon: 'bi-calendar-event', permission: P.EVENT_MANAGE, step: 8 },
    { label: 'Announcements', to: '/admin/announcements', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_MANAGE, step: 8 },
    { label: 'Timetable', to: '/admin/timetable', icon: 'bi-table', permission: P.TIMETABLE_MANAGE, step: 8 },
    { label: 'Reports', to: '/admin/reports', icon: 'bi-file-earmark-bar-graph', permission: P.REPORT_VIEW_ALL, step: 9 },
    { label: 'Settings', to: '/admin/settings', icon: 'bi-gear', permission: P.SETTINGS_MANAGE, step: 9 },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher', icon: 'bi-house-door', end: true },
    { label: 'My Classes', to: '/teacher/classes', icon: 'bi-grid-3x3-gap', permission: P.STUDENT_VIEW_ASSIGNED, step: 4 },
    { label: 'Students', to: '/teacher/students', icon: 'bi-people', permission: P.STUDENT_VIEW_ASSIGNED, step: 4 },
    { label: 'Attendance', to: '/teacher/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_MARK, step: 5 },
    { label: 'Marks', to: '/teacher/marks', icon: 'bi-journal-check', permission: P.MARKS_ENTER, step: 6 },
    { label: 'Assignments', to: '/teacher/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_MANAGE, step: 8 },
    { label: 'Timetable', to: '/teacher/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW, step: 8 },
    { label: 'Notices', to: '/teacher/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW, step: 8 },
  ],
  student: [
    { label: 'Dashboard', to: '/student', icon: 'bi-house-door', end: true },
    { label: 'My Attendance', to: '/student/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_VIEW_OWN, step: 5 },
    { label: 'Results', to: '/student/results', icon: 'bi-journal-text', permission: P.RESULT_VIEW_OWN, step: 6 },
    { label: 'Assignments', to: '/student/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_VIEW, step: 8 },
    { label: 'Timetable', to: '/student/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW, step: 8 },
    { label: 'Notices', to: '/student/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW, step: 8 },
  ],
  parent: [
    { label: 'Dashboard', to: '/parent', icon: 'bi-house-door', end: true },
    { label: 'My Children', to: '/parent/children', icon: 'bi-people', permission: P.STUDENT_VIEW_CHILDREN, step: 4 },
    { label: 'Attendance', to: '/parent/attendance', icon: 'bi-calendar2-check', permission: P.ATTENDANCE_VIEW_CHILDREN, step: 5 },
    { label: 'Results', to: '/parent/results', icon: 'bi-journal-text', permission: P.RESULT_VIEW_CHILDREN, step: 6 },
    { label: 'Fees', to: '/parent/fees', icon: 'bi-receipt', permission: P.FEE_VIEW_CHILDREN, step: 7 },
    { label: 'Assignments', to: '/parent/assignments', icon: 'bi-journal-plus', permission: P.ASSIGNMENT_VIEW, step: 8 },
    { label: 'Timetable', to: '/parent/timetable', icon: 'bi-table', permission: P.TIMETABLE_VIEW, step: 8 },
    { label: 'Notices', to: '/parent/notices', icon: 'bi-megaphone', permission: P.ANNOUNCEMENT_VIEW, step: 8 },
  ],
};

export function navigationFor(role) {
  return NAVIGATION[role] || [];
}

export default NAVIGATION;
