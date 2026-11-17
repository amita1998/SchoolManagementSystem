import DashboardPlaceholder from '../../components/DashboardPlaceholder.jsx';

export default function StudentDashboard() {
  return (
    <DashboardPlaceholder
      role="student"
      title="Student dashboard"
      points={[
        'You signed in with your Admission ID',
        'Only your own records are readable — another student’s ID returns 403 on the server',
        'Results appear here only after the admin publishes them',
      ]}
    />
  );
}
