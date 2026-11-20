import { useState } from 'react';
import * as leave from '../../services/leave.js';

const STATUS_TONE = {
  pending: 'badge--warn',
  approved: 'badge--ok',
  rejected: 'badge--danger',
  cancelled: 'badge--muted',
};

/**
 * The request list, shared by admin / teacher / student / parent.
 * `canDecide` turns the row into a decision (admin, and the class teacher for their own students).
 */
export default function LeaveBoard({ rows, canDecide = false, onChanged, loading = false }) {
  const [busy, setBusy] = useState(null);

  async function decide(row, decision) {
    setBusy(row.id);
    try {
      await leave.decideLeave(row.id, {
        decision,
        note: decision === 'rejected' ? 'Rejected by the school office' : null,
      });
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  async function cancel(row) {
    setBusy(row.id);
    try {
      await leave.cancelLeave(row.id);
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="loading-block"><div className="skeleton skeleton--table" /></div>;

  if (!rows || rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__icon"><i className="bi bi-calendar2-x" aria-hidden="true" /></span>
        <strong>No leave requests</strong>
        <span>Applications will be listed here with their dates and status.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th className="align-right">Days</th>
            <th>Status</th>
            <th className="col-actions align-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Member">
                <strong>{row.member_name}</strong>
                <div className="muted mono">
                  {row.member_code}
                  {row.class_name ? ` · ${row.class_name}${row.section_name ? ` ${row.section_name}` : ''}` : ''}
                </div>
              </td>
              <td data-label="Type">
                {row.leave_type}
                {row.reason ? <div className="muted leave-reason">{row.reason}</div> : null}
              </td>
              <td data-label="From">{row.from_label}</td>
              <td data-label="To">{row.to_label}</td>
              <td className="align-right num" data-label="Days">{row.days}</td>
              <td data-label="Status">
                <span className={`badge ${STATUS_TONE[row.status] || 'badge--muted'}`}>{row.status}</span>
                {row.decision_note ? <div className="muted leave-reason">{row.decision_note}</div> : null}
              </td>
              <td className="align-right" data-label="Action">
                {row.status === 'pending' && canDecide ? (
                  <span className="row-actions">
                    <button type="button" className="btn-primary btn--sm" disabled={busy === row.id}
                      onClick={() => decide(row, 'approved')}>
                      Approve
                    </button>
                    <button type="button" className="btn-ghost btn--sm" disabled={busy === row.id}
                      onClick={() => decide(row, 'rejected')}>
                      Reject
                    </button>
                  </span>
                ) : row.status === 'pending' ? (
                  <button type="button" className="btn-ghost btn--sm" disabled={busy === row.id}
                    onClick={() => cancel(row)}>
                    Cancel
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
