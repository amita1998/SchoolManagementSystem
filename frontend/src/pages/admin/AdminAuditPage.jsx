import { useCallback, useEffect, useState } from 'react';
import * as ops from '../../services/ops.js';
import { PageHeader, Notice, Pagination } from '../../components/ui/PageHeader.jsx';

export default function AdminAuditPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '', page: 1 });
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  const load = useCallback(() => {
    ops
      .audit(filters)
      .then((payload) => {
        setRows(payload.rows);
        setMeta({ page: payload.page, pages: Math.max(1, Math.ceil(payload.total / payload.limit)), total: payload.total });
      })
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the audit log.' }));
  }, [filters]);

  useEffect(load, [load]);

  return (
    <div className="page">
      <PageHeader
        title="Audit log"
        subtitle="Append-only. Every admission, correction, marks change, fee entry and login is recorded."
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      <section className="section-card">
        <div className="section-card__head">
          <h3>Filter</h3>
          <span className="muted">{meta.total} entries</span>
        </div>
        <div className="filter-row">
          <input placeholder="Action, e.g. fee.payment" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value, page: 1 })} />
          <input placeholder="Entity, e.g. students" value={filters.entityType} onChange={(event) => setFilters({ ...filters, entityType: event.target.value, page: 1 })} />
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} aria-label="From" />
          <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} aria-label="To" />
        </div>

        {rows.length === 0 ? (
          <p className="empty-state">No entries match.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.created_label}</td>
                    <td>
                      {row.actor} <span className="muted">{row.actor_role || ''}</span>
                    </td>
                    <td><code>{row.action}</code></td>
                    <td>
                      {row.entity_type}
                      {row.entity_id ? <span className="muted"> #{row.entity_id}</span> : null}
                    </td>
                    <td className="audit-diff">
                      {row.old_values && <span className="audit-diff__old">{JSON.stringify(row.old_values)}</span>}
                      {row.new_values && <span className="audit-diff__new">{JSON.stringify(row.new_values)}</span>}
                      {row.reason && <em>“{row.reason}”</em>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(page) => setFilters({ ...filters, page })} />
      </section>
    </div>
  );
}
