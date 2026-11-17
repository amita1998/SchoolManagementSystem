import { useCallback, useEffect, useState } from 'react';
import * as ops from '../../services/ops.js';
import { PageHeader, Notice, Pagination } from '../../components/ui/PageHeader.jsx';

export default function AdminAuditPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', entityType: '', actor: '', from: '', to: '', page: 1 });
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
          <h3>Audit entries</h3>
          <span className="report-count">rows: {meta.total}</span>
        </div>

        <div className="filters finance-filters audit-filters">
          <input
            placeholder="Action, e.g. fee.payment"
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value, page: 1 })}
            aria-label="Action"
          />
          <input
            placeholder="Entity, e.g. students"
            value={filters.entityType}
            onChange={(event) => setFilters({ ...filters, entityType: event.target.value, page: 1 })}
            aria-label="Entity"
          />
          <input
            placeholder="Actor, e.g. principal"
            value={filters.actor}
            onChange={(event) => setFilters({ ...filters, actor: event.target.value, page: 1 })}
            aria-label="Actor"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })}
            aria-label="From"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })}
            aria-label="To"
          />
        </div>

        {rows.length === 0 ? (
          <p className="table-empty">No entries match these filters.</p>
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
                    <td>
                      <span className="audit-when">{row.created_label}</span>
                    </td>
                    <td>
                      <div className="audit-actor">
                        <strong>{row.actor}</strong>
                        {row.actor_role ? <span className="soft-chip soft-chip--cap">{row.actor_role}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className="audit-action">{row.action}</span>
                    </td>
                    <td>
                      <span className="audit-entity">{row.entity_type}</span>
                      {row.entity_id ? <span className="audit-entity__id">#{row.entity_id}</span> : null}
                    </td>
                    <td>
                      <div className="audit-diff">
                        {row.old_values && (
                          <span className="audit-diff__chip audit-diff__chip--old" title="Before">
                            <span className="audit-diff__sign" aria-hidden="true">−</span>
                            {JSON.stringify(row.old_values)}
                          </span>
                        )}
                        {row.new_values && (
                          <span className="audit-diff__chip audit-diff__chip--new" title="After">
                            <span className="audit-diff__sign" aria-hidden="true">+</span>
                            {JSON.stringify(row.new_values)}
                          </span>
                        )}
                        {row.reason && <em className="audit-diff__reason">“{row.reason}”</em>}
                      </div>
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
