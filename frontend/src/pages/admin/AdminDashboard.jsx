import DashboardPlaceholder from '../../components/DashboardPlaceholder.jsx';

export default function AdminDashboard() {
  return (
    <DashboardPlaceholder
      role="admin"
      title="Admin dashboard"
      points={[
        'Full access to every module, with the audit log recording sensitive changes',
        'Attendance is monitored here — only the class teacher marks it',
        'Student, teacher, class and subject management land in Step 4',
      ]}
    />
  );
}
