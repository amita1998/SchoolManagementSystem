import { useEffect, useState } from 'react';
import * as ops from '../../services/ops.js';
import { getClasses } from '../../services/admin.js';
import { listExams } from '../../services/exams.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';

const REPORTS = [
  {
    key: 'students',
    title: 'Student register',
    hint: 'Every active student with class, guardian and status.',
    filters: [
      { key: 'classId', label: 'Class', type: 'class' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  },
  {
    key: 'attendance',
    title: 'Attendance summary',
    hint: 'Per student: days marked, present/absent split and percentage.',
    filters: [
      { key: 'from', label: 'From', type: 'date' },
      { key: 'to', label: 'To', type: 'date' },
      { key: 'classId', label: 'Class', type: 'class' },
    ],
  },
  {
    key: 'results',
    title: 'Examination results',
    hint: 'Marks per subject for one examination.',
    filters: [{ key: 'examId', label: 'Exam', type: 'exam' }],
  },
  {
    key: 'fees',
    title: 'Fee collection',
    hint: 'Every payment and reversal in the period.',
    filters: [
      { key: 'from', label: 'From', type: 'date' },
      { key: 'to', label: 'To', type: 'date' },
    ],
  },
];

const STATUSES = ['active', 'new_admission', 'promoted', 'graduated', 'transferred', 'withdrawn', 'suspended'];

/** Right-aligned + tabular so a column of figures can be read down. */
const NUMERIC_COLUMNS = new Set([
  'marked',
  'present',
  'absent',
  'late',
  'half_day',
  'leave',
  'percentage',
  'max_marks',
  'marks_obtained',
  'amount',
]);

export default function AdminReportsPage() {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [params, setParams] = useState({});
  const [active, setActive] = useState('students');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    Promise.all([getClasses(), listExams()]).then(([classList, examList]) => {
        setClasses(classList || []);
        setExams(examList);
      })
      .catch(() => {});
  }, []);

  function setFilter(key, value) {
    setParams((current) => ({ ...current, [key]: value }));
  }

  async function preview(key = active) {
    const target = REPORTS.find((item) => item.key === key);
    if (target.filters.some((filter) => filter.type === 'exam') && !params.examId) {
      setNotice({ kind: 'error', text: 'Choose an examination first — the results report is per exam.' });
      return;
    }
    setBusy(true);
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined));
      const result = await ops.report(key, clean);
      setData(result);
      setActive(key);
      if (result.rows.length === 0) setNotice({ kind: 'info', text: 'No rows match these filters.' });
      else setNotice({ kind: 'info', text: '' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not build that report.' });
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined));
      await ops.downloadReport(active, clean);
      setNotice({ kind: 'success', text: 'CSV downloaded.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Download failed.' });
    }
  }

  const report = REPORTS.find((item) => item.key === active);

  function filterControl(filter) {
    const value = params[filter.key] || '';
    const onChange = (event) => setFilter(filter.key, event.target.value);

    if (filter.type === 'class') {
      return (
        <select key={filter.key} value={value} onChange={onChange} aria-label={filter.label}>
          <option value="">{filter.label}: all</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      );
    }
    if (filter.type === 'exam') {
      return (
        <select key={filter.key} value={value} onChange={onChange} aria-label={filter.label}>
          <option value="">{filter.label}: choose…</option>
          {exams.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      );
    }
    if (filter.type === 'status') {
      return (
        <select key={filter.key} value={value} onChange={onChange} aria-label={filter.label}>
          <option value="">{filter.label}: all</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>{option.replace('_', ' ')}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        key={filter.key}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={filter.label}
      />
    );
  }

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Every list is built on the server; exports open in Excel." />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      <section className="section-card">
        <div className="section-card__head">
          <h3>Build a report</h3>
          <span className="muted">{report.filters.length} filter{report.filters.length === 1 ? '' : 's'}</span>
        </div>
        <p className="report-hint">{report.hint}</p>
        <div className="filters finance-filters report-toolbar">
          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setData(null);
            }}
            aria-label="Report"
          >
            {REPORTS.map((item) => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
          {report.filters.map((filter) => filterControl(filter))}
          <div className="report-toolbar__actions">
            <button className="btn-primary" type="button" onClick={() => preview()} disabled={busy}>
              <i className="bi bi-play-fill" aria-hidden="true" /> {busy ? 'Building…' : 'Preview'}
            </button>
            <button className="btn-ghost" type="button" onClick={download} disabled={!data || data.rows.length === 0}>
              <i className="bi bi-download" aria-hidden="true" /> Download CSV
            </button>
          </div>
        </div>
      </section>

      {!data && (
        <section className="section-card">
          <div className="empty-state">
            <span className="empty-state__icon">
              <i className="bi bi-table" aria-hidden="true" />
            </span>
            <strong>Nothing previewed yet</strong>
            Choose a report and press Preview. The CSV exports the full result, not just the preview.
          </div>
        </section>
      )}

      {data && (
        <section className="section-card report-stack">
          <div className="section-card__head">
            <h3>{report.title}</h3>
            <span className="report-count">rows: {data.total}</span>
          </div>

          {data.rows.length === 0 ? (
            <p className="table-empty">No rows match these filters. Widen the range or clear a filter.</p>
          ) : (
            <div className="table-wrap report-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column.key} className={NUMERIC_COLUMNS.has(column.key) ? 'fee-num' : undefined}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(0, 200).map((row, index) => (
                    <tr key={index}>
                      {data.columns.map((column) => (
                        <td key={column.key} className={NUMERIC_COLUMNS.has(column.key) ? 'fee-num' : undefined}>
                          {row[column.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.rows.length > 200 && (
            <p className="report-note">Showing the first 200 rows. Download the CSV for the full set.</p>
          )}
        </section>
      )}
    </div>
  );
}
