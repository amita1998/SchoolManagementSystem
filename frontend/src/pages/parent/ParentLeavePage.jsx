import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/forms/Field.jsx';
import LeaveBoard from '../../components/leave/LeaveBoard.jsx';
import LeaveApplyForm from '../../components/leave/LeaveApplyForm.jsx';
import { api } from '../../services/api.js';
import * as leave from '../../services/leave.js';

/** Parent: apply for leave on behalf of a child and follow the decision. */
export default function ParentLeavePage() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/dashboard/parent');
        const list = data.data?.children || [];
        setChildren(list);
        if (list.length) setChildId(String(list[0].id));
        else setLoading(false);
      } catch (error) {
        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load your children.' });
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const [data, typeList] = await Promise.all([leave.getRequests({ limit: 50 }), leave.getTypes()]);
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
      <PageHeader title="Leave" subtitle="Apply for your child's leave and track the decision." />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="academics-layout">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Requests</h3>
            {children.length > 1 && (
              <Select label="Child" name="leaveChild" value={childId}
                options={children.map((child) => ({
                  value: child.id,
                  label: `${child.name || `${child.first_name || ''} ${child.last_name || ''}`.trim()} · ${child.admissionId || child.admission_id || ''}`,
                }))}
                onChange={(event) => setChildId(event.target.value)} />
            )}
          </div>
          <LeaveBoard rows={rows} loading={loading} onChanged={load} />
        </section>

        <section className="section-card academics-side">
          <div className="section-card__head">
            <h3>Apply for leave</h3>
            <span className="muted">{children.length > 1 ? 'Chosen child' : 'Your child'}</span>
          </div>
          <LeaveApplyForm types={types} memberPayload={childId ? { studentId: Number(childId) } : {}}
            onDone={() => { load(); setNotice({ kind: 'success', text: 'Leave request sent for approval.' }); }}
            onError={(error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not apply.' })} />
        </section>
      </div>
    </div>
  );
}
