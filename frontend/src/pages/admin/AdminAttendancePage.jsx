import { useCallback, useEffect, useMemo, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice, Pagination, StatusBadge } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/forms/Field.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminAttendancePage() {
  const [tab, setTab] = useState('Daily');
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({ date: today(), classId: '', sectionId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], meta: null, summary: null });
  const [corrections, setCorrections] = useState([]);
  const [comments, setComments] = useState({});
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    admin.getOptions().then(setOptions).catch(() => {});
  }, []);

  const loadDaily = useCallback(async () => {
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
    }
  }, [filters, page]);

  const loadCorrections = useCallback(async () => {
    try {
      setCorrections(await attendanceApi.corrections({}));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load corrections.' });
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

  return (
    <div className="page">
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
            {item === 'Corrections' && corrections.some((c) => c.status === 'pending') && (
              <span className="tab__count">{corrections.filter((c) => c.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Daily' && (
        <section className="section-card">
          <div className="filters">
            <label className="form-field">
              <span>Date</span>
              <input type="date" value={filters.date} max={today()}
                onChange={(event) => { setFilters((c) => ({ ...c, date: event.target.value })); setPage(1); }} />
            </label>
            <Select label="Class" value={filters.classId} placeholder="All classes"
              onChange={(event) => { setFilters((c) => ({ ...c, classId: event.target.value, sectionId: '' })); setPage(1); }}
              options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
            <Select label="Section" value={filters.sectionId} placeholder="All sections"
              onChange={(event) => { setFilters((c) => ({ ...c, sectionId: event.target.value })); setPage(1); }}
              options={sectionOptions} disabled={!filters.classId} />
          </div>

          {data.summary && (
            <div className="summary-chips">
              <span className="summary-chip"><strong>{data.summary.percentage}%</strong> attendance</span>
              <span className="summary-chip">{data.summary.counts.present} present</span>
              <span className="summary-chip">{data.summary.counts.absent} absent</span>
              <span className="summary-chip">{data.summary.counts.late} late</span>
              <span className="summary-chip">{data.summary.counts.half_day} half day</span>
              <span className="summary-chip">{data.summary.counts.leave} leave</span>
            </div>
          )}

          {data.rows.length === 0 ? (
            <p className="table-empty">No attendance recorded for this filter.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Admission ID</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Marked by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date_label}</td>
                      <td className="mono">{row.admission_id}</td>
                      <td>{row.student_name}</td>
                      <td>{row.class_name} {row.section_name}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="muted">{row.marked_by || '—'}</td>
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
        <section className="section-card">
          {corrections.length === 0 ? (
            <p className="table-empty">No correction requests yet.</p>
          ) : (
            <div className="stack">
              {corrections.map((item) => (
                <div className={`correction-row ${item.status === 'pending' ? 'is-pending' : ''}`} key={item.id}>
                  <div className="correction-row__head">
                    <strong>
                      {item.student_name} · {item.class_name} {item.section_name}
                    </strong>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="correction-row__meta">
                    {item.date_label} · {item.old_status.replace('_', ' ')} →{' '}
                    <strong>{item.requested_status.replace('_', ' ')}</strong> · by{' '}
                    {item.requested_by_name}
                  </p>
                  <p className="correction-row__reason">{item.reason}</p>
                  {item.status === 'pending' ? (
                    <div className="inline-form">
                      <input type="text" placeholder="Comment (optional)" value={comments[item.id] || ''}
                        onChange={(event) => setComments((c) => ({ ...c, [item.id]: event.target.value }))} />
                      <button type="button" className="btn-primary" onClick={() => review(item.id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="btn-danger" onClick={() => review(item.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <p className="field-hint">
                      {item.reviewed_by_name} · {item.review_comment || 'no comment'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
