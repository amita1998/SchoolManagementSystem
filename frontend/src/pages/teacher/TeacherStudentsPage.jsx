import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/**
 * The roster of the classes this teacher teaches. The server narrows the list (student.view.assigned);
 * the class picker is built from the teacher's own classes, so it cannot ask for another class.
 */
export default function TeacherStudentsPage() {
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const classId = params.get('classId') || '';

  useEffect(() => {
    admin
      .getMyClasses()
      .then((data) => setClasses(data.classes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    admin
      .listStudents({ search: term || undefined, classId: classId || undefined, page, limit: 25 })
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setMeta(data.meta);
        setError('');
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.error?.message || 'Could not load the roster.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term, classId, page]);

  const pageCount = useMemo(() => (meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1), [meta]);

  function pickClass(value) {
    const next = new URLSearchParams(params);
    if (value) next.set('classId', value);
    else next.delete('classId');
    setParams(next, { replace: true });
    setPage(1);
  }

  return (
    <div className="page">
      <PageHeader
        title="Students"
        subtitle="Only the classes you teach this year. Read-only — the office edits records."
      />
      {error && <Notice kind="error">{error}</Notice>}

      <section className="section-card">
        <div className="filters">
          <label className="filters__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder="Name or admission ID"
              aria-label="Search students"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="filter-row">
            <select
              aria-label="Class"
              value={classId}
              onChange={(event) => pickClass(event.target.value)}
            >
              <option value="">All my classes</option>
              {classes.map((item) => (
                <option key={item.class_id} value={item.class_id}>
                  {item.class_name}
                </option>
              ))}
            </select>
          </div>

          {meta && (
            <span className="summary-chip">
              <strong>{meta.total}</strong> student{meta.total === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {busy && rows.length === 0 ? (
          <div className="loading-block" aria-hidden="true">
            <div className="skeleton skeleton--table" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No students match this filter"
            text="Try a different name, admission ID or class. Only the classes you teach are listed."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission ID</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Guardian mobile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Student">{row.name}</td>
                    <td data-label="Admission ID" className="mono">{row.admissionId}</td>
                    <td data-label="Class">{row.className || '—'}</td>
                    <td data-label="Section">{row.sectionName || '—'}</td>
                    <td data-label="Guardian mobile">{row.guardianMobile || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <nav className="pagination" aria-label="Roster pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
            <span className="pagination__meta">
              Page {page} of {pageCount} · {meta?.total} record{meta?.total === 1 ? '' : 's'}
            </span>
          </nav>
        )}
      </section>
    </div>
  );
}
