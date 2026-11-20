import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import LeaveBoard from '../../components/leave/LeaveBoard.jsx';
import LeaveApplyForm from '../../components/leave/LeaveApplyForm.jsx';
import * as leave from '../../services/leave.js';

/** Teacher: apply for own leave, and decide the leave of students in their own sections. */
export default function TeacherLeavePage() {
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
      <PageHeader title="Leave" subtitle="Apply for your own leave; approve leave for your class students." />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="academics-layout">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Requests</h3>
            <span className="muted">{rows.filter((r) => r.status === 'pending').length} pending</span>
          </div>
          <LeaveBoard rows={rows} canDecide loading={loading}
            onChanged={() => { load(); setNotice({ kind: 'success', text: 'Decision saved.' }); }} />
        </section>

        <section className="section-card academics-side">
          <div className="section-card__head">
            <h3>Apply for leave</h3>
            <span className="muted">Your own</span>
          </div>
          <LeaveApplyForm types={types} memberPayload={{}}
            onDone={() => { load(); setNotice({ kind: 'success', text: 'Leave request sent for approval.' }); }}
            onError={(error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not apply.' })} />
        </section>
      </div>
    </div>
  );
}
