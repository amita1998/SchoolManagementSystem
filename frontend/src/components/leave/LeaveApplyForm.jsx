import { useState } from 'react';
import Field, { Select } from '../forms/Field.jsx';
import * as leave from '../../services/leave.js';

/**
 * Apply-for-leave form; the member comes from the caller (self / selected child / self as staff).
 *
 * Duration is a property of the request, not of the leave type: the same "sick leave" can cost a
 * full day or two hours. Choosing Half day or Hours collapses the range to a single date, because
 * the database rejects a short leave that spans days.
 */
const DURATIONS = [
  { value: 'full_day', label: 'Full day' },
  { value: 'half_day', label: 'Half day' },
  { value: 'hourly', label: 'A few hours' },
];

export default function LeaveApplyForm({ types, memberPayload, onDone, onError }) {
  const [form, setForm] = useState({
    leaveTypeId: '',
    durationType: 'full_day',
    hours: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [busy, setBusy] = useState(false);

  const isShort = form.durationType !== 'full_day';

  function changeDuration(value) {
    setForm((current) => ({
      ...current,
      durationType: value,
      // a short leave is one date: keep "To" in step with "From" instead of hiding a stale value
      toDate: value === 'full_day' ? current.toDate : current.fromDate,
    }));
  }

  function changeFrom(value) {
    setForm((current) => ({
      ...current,
      fromDate: value,
      toDate: current.durationType === 'full_day' && current.toDate ? current.toDate : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await leave.applyLeave({
        ...memberPayload,
        leaveTypeId: Number(form.leaveTypeId),
        durationType: form.durationType,
        hours: form.durationType === 'hourly' ? Number(form.hours) : undefined,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
      });
      setForm({ leaveTypeId: '', durationType: 'full_day', hours: '', fromDate: '', toDate: '', reason: '' });
      onDone?.();
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(false);
    }
  }

  const incomplete =
    !form.leaveTypeId ||
    !form.fromDate ||
    !form.toDate ||
    !form.reason ||
    (form.durationType === 'hourly' && !form.hours);

  return (
    <form className="stack" onSubmit={submit}>
      <Select label="Leave type" name="leaveType" value={form.leaveTypeId} placeholder="Select type"
        options={types.map((type) => ({
          value: type.id,
          label: type.annual_quota === null ? type.name : `${type.name} (${type.annual_quota} days/year)`,
        }))}
        onChange={(event) => setForm((c) => ({ ...c, leaveTypeId: event.target.value }))} />

      <Select label="How long?" name="durationType" value={form.durationType} options={DURATIONS}
        hint={isShort ? 'Half day = 0.5, hours are counted against the same quota.' : 'Every day in the range.'}
        onChange={(event) => changeDuration(event.target.value)} />

      {form.durationType === 'hourly' && (
        <Field label="Hours" name="hours" type="number" min="1" max="8" value={form.hours} required
          hint="Between 1 and 8 hours."
          onChange={(event) => setForm((c) => ({ ...c, hours: event.target.value }))} />
      )}

      <Field label={isShort ? 'Date' : 'From'} name="fromDate" type="date" value={form.fromDate} required
        onChange={(event) => changeFrom(event.target.value)} />
      {!isShort && (
        <Field label="To" name="toDate" type="date" value={form.toDate} required
          onChange={(event) => setForm((c) => ({ ...c, toDate: event.target.value }))} />
      )}

      <Field label="Reason" name="reason" value={form.reason} required
        hint="One line the office can act on."
        onChange={(event) => setForm((c) => ({ ...c, reason: event.target.value }))} />
      <button type="submit" className="btn-primary btn--block" disabled={busy || incomplete}>
        Apply for leave
      </button>
    </form>
  );
}
