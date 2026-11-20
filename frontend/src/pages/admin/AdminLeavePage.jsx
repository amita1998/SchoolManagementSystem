import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import LeaveBoard from '../../components/leave/LeaveBoard.jsx';
import * as leave from '../../services/leave.js';

/** Admin: every request, approve or reject, plus the leave types in force. */
export default function AdminLeavePage() {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  const load = useCallback(async () => {
    try {
      const [data, typeList] = await Promise.all([leave.getRequests({ limit: 100 }), leave.getTypes()]);
      setRows(data.rows);
      setTypes(typeList);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load leave requests.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = rows.filter((row) => row.status === 'pending').length;

  return (
    <div className="page leave-page">
      <PageHeader title="Leave" subtitle="Approve or reject leave for students and staff." />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="academics-layout">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Requests</h3>
            <span className="muted">{pending} pending · {rows.length} total</span>
          </div>
          <LeaveBoard rows={rows} canDecide loading={loading}
            onChanged={() => { load(); setNotice({ kind: 'success', text: 'Decision saved.' }); }} />
        </section>

        <section className="section-card academics-side">
          <div className="section-card__head">
            <h3>Leave types</h3>
            <span className="muted">{types.length}</span>
          </div>
          <ul className="leave-types">
            {types.map((type) => (
              <li key={type.id}>
                <strong>{type.name}</strong>
                <span className="muted">
                  {type.applies_to === 'both' ? 'students & staff' : type.applies_to}
                  {type.annual_quota === null ? ' · no limit' : ` · ${type.annual_quota} days/year`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
