import { useCallback, useEffect, useMemo, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice, Pagination, StatusBadge } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const ATTENDANCE_STATUSES = [
  { value: 'present', short: 'P', label: 'Present', tone: 'ok' },
  { value: 'late', short: 'L', label: 'Late', tone: 'warn' },
  { value: 'absent', short: 'A', label: 'Absent', tone: 'danger' },
  { value: 'half_day', short: 'H', label: 'Half day', tone: 'info' },
  { value: 'leave', short: 'Lv', label: 'Leave', tone: 'purple' },
];

const STATUS_LABEL = Object.fromEntries(
  ATTENDANCE_STATUSES.map((status) => [status.value, status.label]),
);

const statusLabel = (value) => STATUS_LABEL[value] || String(value || '').replace(/_/g, ' ');

export default function AdminAttendancePage() {
  const [tab, setTab] = useState('Daily');
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({ date: today(), classId: '', sectionId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null, summary: null });
  const [corrections, setCorrections] = useState([]);
  const [comments, setComments] = useState({});
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [dailyLoading, setDailyLoading] = useState(true);
  const [correctionsLoading, setCorrectionsLoading] = useState(true);

  useEffect(() => {
    admin.getOptions().then(setOptions).catch(() => {});
  }, []);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      setData(
        await attendanceApi.list({
          date: filters.date || undefined,
          sectionId: filters.sectionId || undefined,
          page,
          limit: 25,
        }),
      );
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load attendance.' });
    } finally {
      setDailyLoading(false);
    }
  }, [filters, page]);

  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    try {
      setCorrections(await attendanceApi.corrections({}));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load corrections.' });
    } finally {
      setCorrectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'Daily') loadDaily();
    else loadCorrections();
  }, [tab, loadDaily, loadCorrections]);

  const sectionOptions = useMemo(() => {
    const klass = options?.classes.find((item) => String(item.id) === String(filters.classId));
    return (klass?.sections || []).map((section) => ({ value: section.id, label: section.name }));
  }, [options, filters.classId]);

  async function review(id, decision) {
    try {
      await attendanceApi.reviewCorrection(id, { decision, comment: comments[id] || undefined });
      setNotice({ kind: 'success', text: `Request ${decision}.` });
      setComments((current) => ({ ...current, [id]: '' }));
      loadCorrections();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not review.' });
    }
  }

  const pendingCount = corrections.filter((item) => item.status === 'pending').length;
  const pastDay = Boolean(filters.date) && filters.date < today();

  return (
    <div className="page attendance-page">
      <PageHeader
        title="Attendance"
        subtitle="Admins monitor attendance and decide correction requests; only class teachers mark it."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="tabs">
        {['Daily', 'Corrections'].map((item) => (
          <button key={item} type="button" className={`tab ${tab === item ? 'is-active' : ''}`}
            onClick={() => setTab(item)}>
            {item}
            {item === 'Corrections' && pendingCount > 0 && (
              <span className="tab__count">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Daily' && (
        <section className="section-card attendance-card">
          <div className="section-card__head">
            <h3>Daily register</h3>
            <span className="muted">
              {data.meta ? `${data.meta.total} record${data.meta.total === 1 ? '' : 's'} · page ${data.meta.page} of ${data.meta.pages}` : 'All classes'}
            </span>
          </div>

          <div className="attendance-toolbar">
            <Field label="Date" name="attendance-date" type="date" value={filters.date} max={today()}
              onChange={(event) => { setFilters((c) => ({ ...c, date: event.target.value })); setPage(1); }} />
            <Select label="Class" name="attendance-class" value={filters.classId} placeholder="All classes"
              onChange={(event) => { setFilters((c) => ({ ...c, classId: event.target.value, sectionId: '' })); setPage(1); }}
              options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
            <Select label="Section" name="attendance-section" value={filters.sectionId} placeholder="All sections"
              onChange={(event) => { setFilters((c) => ({ ...c, sectionId: event.target.value })); setPage(1); }}
              options={sectionOptions} disabled={!filters.classId} />
            <p className="attendance-toolbar__meta">
              <i className={`bi ${pastDay ? 'bi-lock' : 'bi-clock'}`} aria-hidden="true" />
              {pastDay ? 'Locked day — read-only' : 'Marking open until 11:59 PM'}
            </p>
          </div>

          {pastDay && (
            <div className="notice notice--warning attendance-lock-notice">
              <i className="bi bi-lock" aria-hidden="true" />
              <span>
                This day is locked: attendance closed at 11:59 PM and only a class teacher can raise a
                correction. Approve or reject pending requests in the Corrections tab.
              </span>
            </div>
          )}

          {data.summary && (
            <div className="summary-chips attendance-summary">
              <span className="summary-chip"><strong>{data.summary.percentage}%</strong> attendance</span>
              <span className="summary-chip is-ok"><strong>{data.summary.counts.present}</strong> present</span>
              <span className="summary-chip is-warn"><strong>{data.summary.counts.late}</strong> late</span>
              <span className="summary-chip is-danger"><strong>{data.summary.counts.absent}</strong> absent</span>
              <span className="summary-chip is-info"><strong>{data.summary.counts.half_day}</strong> half day</span>
              <span className="summary-chip is-purple"><strong>{data.summary.counts.leave}</strong> leave</span>
              <span className="summary-chip"><strong>{data.summary.marked}</strong> marked</span>
            </div>
          )}

          <div className="attendance-legend">
            {ATTENDANCE_STATUSES.map((status) => (
              <span key={status.value}>
                <i className={`attendance-legend__dot attendance-legend__dot--${status.tone}`} aria-hidden="true" />
                <strong>{status.short}</strong> {status.label.toLowerCase()}
              </span>
            ))}
            <span className="attendance-legend__note">Admins view the register; class teachers mark it.</span>
          </div>

          {dailyLoading ? (
            <div className="loading-block">
              <div className="skeleton skeleton--table" />
            </div>
          ) : data.rows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-calendar-x" aria-hidden="true" /></span>
              <strong>No attendance recorded</strong>
              <span>Nothing was marked for this date and section. Change the filters to widen the view.</span>
            </div>
          ) : (
            <div className="table-wrap attendance-sheet">
              <table className="data-table attendance-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Admission ID</th>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Marked by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id}>
                      <td data-label="Student"><strong className="attendance-student">{row.student_name}</strong></td>
                      <td data-label="Admission ID" className="mono">{row.admission_id}</td>
                      <td data-label="Class">{row.class_name} {row.section_name}</td>
                      <td data-label="Date" className="mono">{row.date_label}</td>
                      <td data-label="Status">
                        <div className="status-buttons status-buttons--readonly"
                          role="group" aria-label={`Status for ${row.student_name}`}>
                          {ATTENDANCE_STATUSES.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              disabled
                              data-status={status.value}
                              className={row.status === status.value ? 'is-active' : ''}
                              aria-pressed={row.status === status.value}
                              title={status.label}
                            >
                              {status.short}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td data-label="Marked by" className="muted attendance-by">{row.marked_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination meta={data.meta} onPage={setPage} />
        </section>
      )}

      {tab === 'Corrections' && (
        <section className="section-card attendance-card">
          <div className="section-card__head">
            <h3>Corrections queue</h3>
            <span className="muted">
              {correctionsLoading
                ? 'Loading…'
                : `${pendingCount} pending · ${corrections.length} total`}
            </span>
          </div>

          {correctionsLoading ? (
            <div className="loading-block">
              <div className="skeleton skeleton--table" />
            </div>
          ) : corrections.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-inbox" aria-hidden="true" /></span>
              <strong>No correction requests</strong>
              <span>When a class teacher asks to change a locked day, the request lands here for review.</span>
            </div>
          ) : (
            <div className="table-wrap attendance-corrections">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Change</th>
                    <th>Requester</th>
                    <th>Reason</th>
                    <th>State</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((item) => (
                    <tr key={item.id} className={item.status === 'pending' ? 'is-pending' : ''}>
                      <td data-label="Student">
                        <strong className="attendance-student">{item.student_name}</strong>
                        <span className="attendance-row-meta">
                          {item.admission_id} · {item.class_name} {item.section_name}
                        </span>
                      </td>
                      <td data-label="Date" className="mono">{item.date_label}</td>
                      <td data-label="Change">
                        <span className="att-change">
                          <span className={`att-chip att-chip--${item.old_status}`}>{statusLabel(item.old_status)}</span>
                          <i className="bi bi-arrow-right" aria-hidden="true" />
                          <span className={`att-chip att-chip--${item.requested_status}`}>{statusLabel(item.requested_status)}</span>
                        </span>
                      </td>
                      <td data-label="Requester" className="attendance-by">{item.requested_by_name || '—'}</td>
                      <td data-label="Reason" className="attendance-reason">{item.reason}</td>
                      <td data-label="State"><StatusBadge status={item.status} /></td>
                      <td data-label="Review">
                        {item.status === 'pending' ? (
                          <div className="correction-review">
                            <input
                              type="text"
                              placeholder="Comment (optional)"
                              aria-label={`Review comment for ${item.student_name}`}
                              value={comments[item.id] || ''}
                              onChange={(event) => setComments((c) => ({ ...c, [item.id]: event.target.value }))}
                            />
                            <div className="correction-review__actions">
                              <button type="button" className="btn-primary btn--sm" onClick={() => review(item.id, 'approved')}>
                                <i className="bi bi-check2" aria-hidden="true" />
                                Approve
                              </button>
                              <button type="button" className="btn-danger btn--sm" onClick={() => review(item.id, 'rejected')}>
                                <i className="bi bi-x" aria-hidden="true" />
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="correction-reviewed">
                            <span>{item.reviewed_by_name || 'Reviewed'}</span>
                            <span className="muted">{item.review_comment || 'no comment'}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
