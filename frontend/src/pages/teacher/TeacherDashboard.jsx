import DashboardPlaceholder from '../../components/DashboardPlaceholder.jsx';

export default function TeacherDashboard() {
  return (
    <DashboardPlaceholder
      role="teacher"
      title="Teacher dashboard"
      points={[
        'Scoped to your assigned classes and subjects on the server, not just in the UI',
        'Mark attendance only for the section where you are the class teacher',
        'Marks entry and assignments arrive in Steps 6 and 8',
      ]}
    />
  );
}
