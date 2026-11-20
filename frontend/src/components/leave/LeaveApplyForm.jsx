import { useState } from 'react';
import Field, { Select } from '../forms/Field.jsx';
import * as leave from '../../services/leave.js';

/** Apply-for-leave form; the member comes from the caller (self / selected child / self as staff). */
export default function LeaveApplyForm({ types, memberPayload, onDone, onError }) {
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await leave.applyLeave({ ...memberPayload, ...form, leaveTypeId: Number(form.leaveTypeId) });
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
      onDone?.();
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Select label="Leave type" name="leaveType" value={form.leaveTypeId} placeholder="Select type"
        options={types.map((type) => ({
          value: type.id,
          label: type.annual_quota === null ? type.name : `${type.name} (${type.annual_quota} days/year)`,
        }))}
        onChange={(event) => setForm((c) => ({ ...c, leaveTypeId: event.target.value }))} />
      <Field label="From" name="fromDate" type="date" value={form.fromDate} required
        onChange={(event) => setForm((c) => ({ ...c, fromDate: event.target.value }))} />
      <Field label="To" name="toDate" type="date" value={form.toDate} required
        onChange={(event) => setForm((c) => ({ ...c, toDate: event.target.value }))} />
      <Field label="Reason" name="reason" value={form.reason} required
        hint="One line the office can act on."
        onChange={(event) => setForm((c) => ({ ...c, reason: event.target.value }))} />
      <button type="submit" className="btn-primary btn--block"
        disabled={busy || !form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason}>
        Apply for leave
      </button>
    </form>
  );
}
