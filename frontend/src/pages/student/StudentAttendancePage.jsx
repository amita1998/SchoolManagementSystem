import { useEffect, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const STATUS_TONE = {
  present: 'mint',
  absent: 'coral',
  late: 'amber',
  half_day: 'blue',
  leave: 'purple',
};

/** "2026-11" -> "November 2026" (no Date object, so no timezone shift). */
function monthLabel(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 2) return value || '—';
  const label = MONTHS[Number(parts[1]) - 1];
  return label ? `${label} ${parts[0]}` : value;
}

function statusText(status) {
  return String(status || 'not marked').replace(/_/g, ' ');
}

export function AttendanceSummary({ summary, months, recent, title = 'Attendance', subtitle, childSwitcher }) {
  return (
    <div className="page">
      <PageHeader
        title={title}
        subtitle={subtitle || 'Present and late count as full days; a half day counts as 0.5.'}
      />

      {childSwitcher}

      {!summary ? (
        <div className="loading-block" aria-hidden="true">
          <div className="skeleton-row">
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
          </div>
          <div className="skeleton skeleton--table" />
        </div>
      ) : (
        <>
          <div className="stat-grid stat-grid--three">
            <StatCard
              label="Attendance"
              value={`${summary.percentage}%`}
              hint={`${summary.marked} day${summary.marked === 1 ? '' : 's'} marked`}
              icon="bi-calendar2-check"
              tone={summary.percentage >= 75 ? 'mint' : 'amber'}
            />
            <StatCard
              label="Present"
              value={summary.counts.present}
              hint={`${summary.counts.late} late`}
              icon="bi-check2-circle"
              tone="mint"
            />
            <StatCard
              label="Absent"
              value={summary.counts.absent}
              hint={`${summary.counts.half_day} half day · ${summary.counts.leave} leave`}
              icon="bi-x-circle"
              tone={summary.counts.absent > 0 ? 'coral' : 'blue'}
            />
          </div>

          <div className="summary-chips">
            <span className="summary-chip">
              <strong>{summary.counts.present}</strong> present
            </span>
            <span className="summary-chip">
              <strong>{summary.counts.absent}</strong> absent
            </span>
            <span className="summary-chip">
              <strong>{summary.counts.late}</strong> late
            </span>
            <span className="summary-chip">
              <strong>{summary.counts.half_day}</strong> half day
            </span>
            <span className="summary-chip">
              <strong>{summary.counts.leave}</strong> leave
            </span>
            <span className="summary-chip">
              <strong>{summary.marked}</strong> days marked
            </span>
          </div>

          <div className="dash__grid">
            <section className="section-card">
              <div className="section-card__head">
                <h3>Month by month</h3>
                <span className="muted">Present + late = full day</span>
              </div>
              {months.length === 0 ? (
                <EmptyState
                  icon="bi-calendar3"
                  title="No attendance yet"
                  text="The month-by-month breakdown appears after the first day is marked."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="align-right">Days</th>
                        <th className="align-right">Absent</th>
                        <th className="align-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((row) => (
                        <tr key={row.month}>
                          <td data-label="Month">{monthLabel(row.month)}</td>
                          <td data-label="Days" className="align-right mono">{row.marked}</td>
                          <td data-label="Absent" className="align-right mono">{row.absent}</td>
                          <td data-label="Attendance" className="align-right mono">{row.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="section-card">
              <div className="section-card__head">
                <h3>Recent records</h3>
                <span className="muted">Last 10 days</span>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  icon="bi-clock-history"
                  title="Nothing recorded yet"
                  text="Marked days show up here as soon as the class teacher saves them."
                />
              ) : (
                <ul className="file-list">
                  {recent.map((row) => (
                    <li key={row.id}>
                      <span className="mono">{row.date_label}</span>
                      <span className={`status-badge status-badge--${STATUS_TONE[row.status] || 'blue'}`}>
                        {statusText(row.status)}
                      </span>
                      <span className="muted">
                        {row.class_name} {row.section_name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
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

  if (error) {
    return (
      <div className="page">
        <Notice kind="error">{error}</Notice>
      </div>
    );
  }
  return (
    <AttendanceSummary
      summary={data?.summary}
      months={data?.months || []}
      recent={recent}
      title="My attendance"
    />
  );
}
