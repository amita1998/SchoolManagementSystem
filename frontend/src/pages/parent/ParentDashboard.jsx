import DashboardPlaceholder from '../../components/DashboardPlaceholder.jsx';

export default function ParentDashboard() {
  return (
    <DashboardPlaceholder
      role="parent"
      title="Parent dashboard"
      points={[
        'One family account covers every child; the child switcher arrives in Step 3',
        'Fees and receipts are visible for your own children only',
        'Fee visibility for students stays off unless the admin turns it on',
      ]}
    />
  );
}
