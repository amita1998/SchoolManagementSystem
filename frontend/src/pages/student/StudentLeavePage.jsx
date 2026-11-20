import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import LeaveBoard from '../../components/leave/LeaveBoard.jsx';
import LeaveApplyForm from '../../components/leave/LeaveApplyForm.jsx';
import * as leave from '../../services/leave.js';

/** Student: apply for leave and follow the decision. */
export default function StudentLeavePage() {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  const load = useCallback(async () => {
    try {
      const [data, typeList, balanceRows] = await Promise.all([
        leave.getRequests({ limit: 50 }),
        leave.getTypes(),
        leave.getBalance(),
      ]);
      setRows(data.rows);
      setTypes(typeList);
      setBalance(balanceRows);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load leave.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page leave-page">
      <PageHeader title="Leave" subtitle="Apply for leave; your class teacher and the office decide." />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="summary-chips leave-balance">
        {balance.map((row) => (
          <span key={row.id} className="summary-chip">
            <strong>{row.remaining === null ? '∞' : row.remaining}</strong> {row.name.toLowerCase()} left
          </span>
        ))}
      </div>

      <div className="academics-layout">
        <section className="section-card">
          <div className="section-card__head">
            <h3>My requests</h3>
            <span className="muted">{rows.length} total</span>
          </div>
          <LeaveBoard rows={rows} loading={loading} onChanged={load} />
        </section>

        <section className="section-card academics-side">
          <div className="section-card__head">
            <h3>Apply for leave</h3>
            <span className="muted">New request</span>
          </div>
          <LeaveApplyForm types={types} memberPayload={{}}
            onDone={() => { load(); setNotice({ kind: 'success', text: 'Leave request sent for approval.' }); }}
            onError={(error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not apply.' })} />
        </section>
      </div>
    </div>
  );
}
