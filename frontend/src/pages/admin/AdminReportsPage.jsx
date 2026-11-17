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

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Every list is built on the server; exports open in Excel." />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      <section className="section-card">
        <div className="section-card__head">
          <h3>Choose a report</h3>
        </div>
        <div className="tabs">
          {REPORTS.map((item) => (
            <button key={item.key} type="button" className={active === item.key ? 'is-active' : ''} onClick={() => { setActive(item.key); setData(null); }}>
              {item.title}
            </button>
          ))}
        </div>
        <p className="muted">{report.hint}</p>
        <div className="filter-row">
          {report.filters.map((filter) => {
            if (filter.type === 'class') {
              return (
                <select key={filter.key} value={params[filter.key] || ''} onChange={(event) => setFilter(filter.key, event.target.value)} aria-label={filter.label}>
                  <option value="">{filter.label}: all</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              );
            }
            if (filter.type === 'exam') {
              return (
                <select key={filter.key} value={params[filter.key] || ''} onChange={(event) => setFilter(filter.key, event.target.value)} aria-label={filter.label}>
                  <option value="">{filter.label}: choose…</option>
                  {exams.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              );
            }
            if (filter.type === 'status') {
              return (
                <select key={filter.key} value={params[filter.key] || ''} onChange={(event) => setFilter(filter.key, event.target.value)} aria-label={filter.label}>
                  <option value="">{filter.label}: all</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{value.replace('_', ' ')}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                key={filter.key}
                type="date"
                value={params[filter.key] || ''}
                onChange={(event) => setFilter(filter.key, event.target.value)}
                aria-label={filter.label}
              />
            );
          })}
          <button className="btn btn--primary" type="button" onClick={() => preview()} disabled={busy}>
            {busy ? 'Building…' : 'Preview'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={download} disabled={!data || data.rows.length === 0}>
            Download CSV
          </button>
        </div>
      </section>

      {data && (
        <section className="section-card">
          <div className="section-card__head">
            <h3>{report.title}</h3>
            <span className="muted">{data.total} row{data.total === 1 ? '' : 's'}</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {data.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 200).map((row, index) => (
                  <tr key={index}>
                    {data.columns.map((column) => (
                      <td key={column.key}>{row[column.key] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows.length > 200 && <p className="muted">Showing the first 200 rows. Download the CSV for the full set.</p>}
        </section>
      )}
    </div>
  );
}
