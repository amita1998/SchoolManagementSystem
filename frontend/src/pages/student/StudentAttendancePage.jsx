import { useEffect, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import { PageHeader, StatusBadge, Notice } from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

export function AttendanceSummary({ summary, months, recent, title = 'Attendance' }) {
  if (!summary) return <p className="table-empty">Loading attendance…</p>;
  return (
    <div className="page">
      <PageHeader title={title} subtitle="Present and late count as full days; a half day counts as 0.5." />

      <div className="stat-grid stat-grid--three">
        <StatCard label="Attendance" value={`${summary.percentage}%`} hint={`${summary.marked} days marked`}
          icon="bi-calendar2-check" tone="blue" />
        <StatCard label="Present" value={summary.counts.present} hint={`${summary.counts.late} late`}
          icon="bi-check2-circle" tone="mint" />
        <StatCard label="Absent" value={summary.counts.absent}
          hint={`${summary.counts.half_day} half day · ${summary.counts.leave} leave`}
          icon="bi-x-circle" tone="coral" />
      </div>

      <div className="dash__grid">
        <section className="section-card">
          <h3>Month by month</h3>
          {months.length === 0 ? (
            <p className="table-empty">No attendance yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Month</th><th>Days</th><th>Absent</th><th>Attendance</th></tr>
                </thead>
                <tbody>
                  {months.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{row.marked}</td>
                      <td>{row.absent}</td>
                      <td>{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="section-card">
          <h3>Recent records</h3>
          {recent.length === 0 ? (
            <p className="table-empty">Nothing recorded yet.</p>
          ) : (
            <ul className="file-list">
              {recent.map((row) => (
                <li key={row.id}>
                  <span className="file-list__date">{row.date_label}</span>
                  <StatusBadge status={row.status} />
                  <span className="muted">{row.class_name} {row.section_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StudentAttendancePage() {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([attendanceApi.summary('me'), attendanceApi.list({ limit: 10 })])
      .then(([summaryData, listData]) => {
        setData(summaryData);
        setRecent(listData.rows);
      })
      .catch((requestError) =>
        setError(requestError.response?.data?.error?.message || 'Could not load attendance.'),
      );
  }, []);

  if (error) return <Notice kind="error">{error}</Notice>;
  return <AttendanceSummary summary={data?.summary} months={data?.months || []} recent={recent} title="My attendance" />;
}
