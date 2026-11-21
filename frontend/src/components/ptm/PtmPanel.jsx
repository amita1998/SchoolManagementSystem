import { useCallback, useEffect, useMemo, useState } from 'react';
import Field, { Select } from '../forms/Field.jsx';
import { PageHeader, Notice } from '../ui/PageHeader.jsx';
import * as ptm from '../../services/ptm.js';
import { api } from '../../services/api.js';
import { listTeachers } from '../../services/admin.js';
import { todayISO } from '../../utils/schoolDate.js';

/**
 * Parent–teacher meetings, one screen for all four roles.
 *
 * mode 'admin'   — publish a slot for any teacher, see and mark every booking
 * mode 'teacher' — publish a slot for self, see and mark the bookings of own slots
 * mode 'parent'  — book an open slot for one of their children, cancel their own booking
 * mode 'student' — read the bookings made for them
 */

const MODES = [
  { value: 'in_person', label: 'In person' },
  { value: 'online', label: 'Online' },
  { value: 'phone', label: 'Phone call' },
];

// `.status-badge` + its tone modifiers are the only badge rules in ui.css (`.badge` has none, so a
// pill written that way renders as plain text).
const STATUS_TONE = {
  open: 'status-badge status-badge--mint',
  closed: 'status-badge status-badge--blue',
  cancelled: 'status-badge status-badge--coral',
  booked: 'status-badge status-badge--amber',
  attended: 'status-badge status-badge--mint',
  no_show: 'status-badge status-badge--coral',
};

function today() {
  return todayISO();
}

export default function PtmPanel({ mode = 'admin' }) {
  const canPublish = mode === 'admin' || mode === 'teacher';
  const canDecide = mode === 'admin' || mode === 'teacher';
  const canBook = mode === 'parent';

  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({
    teacherId: '', slotDate: today(), startTime: '10:00', endTime: '10:20',
    mode: 'in_person', location: '', capacity: 1, notes: '',
  });

  const load = useCallback(async () => {
    try {
      const [slotData, bookingData] = await Promise.all([
        ptm.getSlots({ limit: 100 }),
        ptm.getBookings({ limit: 200 }).catch(() => ({ rows: [] })),
      ]);
      setSlots(slotData.rows);
      setBookings(bookingData.rows || []);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load meetings.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode === 'admin') {
      listTeachers({ limit: 200 })
        .then((data) => setTeachers(data.rows || data))
        .catch(() => setTeachers([]));
    }
    if (mode === 'parent') {
      api.get('/dashboard/parent')
        .then(({ data }) => {
          const kids = data.data.children || [];
          setChildren(kids);
          if (kids.length === 1) setChildId(String(kids[0].id));
        })
        .catch(() => setChildren([]));
    }
  }, [mode]);

  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await ptm.createSlot({
        ...form,
        teacherId: form.teacherId ? Number(form.teacherId) : undefined,
        capacity: Number(form.capacity),
        location: form.location || null,
        notes: form.notes || null,
      });
      setNotice({ kind: 'success', text: 'Slot published.' });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not publish the slot.' });
    } finally {
      setBusy(false);
    }
  }

  async function book(slot) {
    const studentId = canBook ? Number(childId) : Number(slot.studentId);
    if (!studentId) {
      setNotice({ kind: 'error', text: 'Choose the child first.' });
      return;
    }
    setBusy(true);
    try {
      await ptm.bookSlot(slot.id, { studentId });
      setNotice({ kind: 'success', text: `Booked ${slot.date_label} at ${slot.start_label}.` });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not book this slot.' });
    } finally {
      setBusy(false);
    }
  }

  async function mark(booking, status) {
    setBusy(true);
    try {
      await ptm.decideBooking(booking.id, { status });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not update the booking.' });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(booking) {
    setBusy(true);
    try {
      await ptm.cancelBooking(booking.id);
      setNotice({ kind: 'success', text: 'Booking cancelled.' });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not cancel the booking.' });
    } finally {
      setBusy(false);
    }
  }

  async function cancelSlot(slot) {
    setBusy(true);
    try {
      await ptm.updateSlot(slot.id, { status: 'cancelled' });
      setNotice({ kind: 'success', text: 'Slot cancelled — booked parents were notified.' });
      await load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not cancel the slot.' });
    } finally {
      setBusy(false);
    }
  }

  const openSlots = useMemo(
    () => slots.filter((slot) => slot.status === 'open' && slot.booked < slot.capacity),
    [slots],
  );

  const bookingsBySlot = useMemo(() => {
    const map = new Map();
    for (const row of bookings) {
      if (!map.has(row.slot_id)) map.set(row.slot_id, []);
      map.get(row.slot_id).push(row);
    }
    return map;
  }, [bookings]);

  const title = {
    admin: 'Parent–teacher meetings',
    teacher: 'My parent–teacher meetings',
    parent: 'Book a meeting with a teacher',
    student: 'My parent–teacher meetings',
  }[mode];

  const subtitle = {
    admin: 'Publish slots for any teacher and follow every booking.',
    teacher: 'Publish your slots; parents book them and you mark attendance.',
    parent: 'Choose an open slot and the child it is for.',
    student: 'Meetings booked for you by your parent or the office.',
  }[mode];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {notice.text ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

      {canPublish ? (
        <section className="section-card">
          <div className="section-card__head"><h3>Publish a slot</h3></div>
          <form className="form-grid" onSubmit={publish}>
            {mode === 'admin' ? (
              <Select label="Teacher" name="teacherId" value={form.teacherId} placeholder="Choose teacher" required
                options={teachers.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.first_name || teacher.firstName || ''} ${teacher.last_name || teacher.lastName || ''}`.trim() || teacher.employee_id,
                }))}
                onChange={(event) => setForm((c) => ({ ...c, teacherId: event.target.value }))} />
            ) : null}
            <Field label="Date" name="slotDate" type="date" value={form.slotDate} required
              onChange={(event) => setForm((c) => ({ ...c, slotDate: event.target.value }))} />
            <Field label="From" name="startTime" type="time" value={form.startTime} required
              onChange={(event) => setForm((c) => ({ ...c, startTime: event.target.value }))} />
            <Field label="To" name="endTime" type="time" value={form.endTime} required
              onChange={(event) => setForm((c) => ({ ...c, endTime: event.target.value }))} />
            <Select label="How" name="mode" value={form.mode} options={MODES}
              onChange={(event) => setForm((c) => ({ ...c, mode: event.target.value }))} />
            <Field label="Place" name="location" value={form.location} hint="Room, or a meeting link."
              onChange={(event) => setForm((c) => ({ ...c, location: event.target.value }))} />
            <Field label="Families per slot" name="capacity" type="number" min="1" max="20" value={form.capacity}
              onChange={(event) => setForm((c) => ({ ...c, capacity: event.target.value }))} />
            <button type="submit" className="btn-primary" disabled={busy || (mode === 'admin' && !form.teacherId)}>
              Publish slot
            </button>
          </form>
        </section>
      ) : null}

      {canBook && children.length > 1 ? (
        <section className="section-card">
          <div className="section-card__head"><h3>Which child?</h3></div>
          <Select label="Child" name="child" value={childId}
            options={children.map((child) => ({
              value: child.id,
              label: `${child.admissionId || child.admission_id || ''} ${child.name || `${child.firstName || ''} ${child.lastName || ''}`}`.trim(),
            }))}
            onChange={(event) => setChildId(event.target.value)} />
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-card__head">
          <h3>{canBook ? 'Open slots' : 'Slots'}</h3>
          <span className="muted">{canBook ? `${openSlots.length} available` : `${slots.length} total`}</span>
        </div>
        {loading ? <div className="loading-block"><div className="skeleton skeleton--table" /></div> : null}
        {!loading && (canBook ? openSlots : slots).length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-calendar2-week" aria-hidden="true" /></span>
            <strong>No slots yet</strong>
            <span>{canBook ? 'The school will publish meeting slots here.' : 'Publish a slot to let parents book.'}</span>
          </div>
        ) : null}
        {!loading && (canBook ? openSlots : slots).length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Teacher</th><th>How</th>
                  <th>Booked</th><th>Status</th><th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(canBook ? openSlots : slots).map((slot) => (
                  <tr key={slot.id}>
                    <td data-label="Date">{slot.date_label}</td>
                    <td data-label="Time">{slot.start_label}–{slot.end_label}</td>
                    <td data-label="Teacher">
                      {slot.teacher_name}
                      {slot.location ? <div className="muted">{slot.location}</div> : null}
                    </td>
                    <td data-label="How">{MODES.find((m) => m.value === slot.mode)?.label || slot.mode}</td>
                    <td data-label="Booked">{slot.booked}/{slot.capacity}</td>
                    <td data-label="Status">
                      <span className={STATUS_TONE[slot.status] || 'status-badge status-badge--blue'}>{slot.status}</span>
                    </td>
                    <td className="align-right" data-label="Action">
                      {canBook ? (
                        <button type="button" className="btn-primary btn--sm" disabled={busy}
                          onClick={() => book(slot)}>
                          Book
                        </button>
                      ) : canPublish && slot.status === 'open' ? (
                        <button type="button" className="btn-ghost btn--sm" disabled={busy}
                          onClick={() => cancelSlot(slot)}>
                          Cancel slot
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
        ) : null}
      </section>

      <section className="section-card">
        <div className="section-card__head">
          <h3>{canBook || mode === 'student' ? 'My bookings' : 'Bookings'}</h3>
          <span className="muted">{bookings.length}</span>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-people" aria-hidden="true" /></span>
            <strong>No bookings yet</strong>
            <span>{canBook
              ? 'Book an open slot above.'
              : mode === 'student'
                ? 'No meeting has been booked for you yet.'
                : 'Parents will appear here once they book.'}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Teacher</th><th>When</th><th>Status</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="Student">
                      <strong>{booking.student_name}</strong>
                      <div className="muted mono">{booking.admission_id}</div>
                    </td>
                    <td data-label="Teacher">{booking.teacher_name}</td>
                    <td data-label="When">{booking.date_label} · {booking.start_label}</td>
                    <td data-label="Status">
                      <span className={STATUS_TONE[booking.status] || 'status-badge status-badge--blue'}>{booking.status}</span>
                      {booking.note ? <div className="muted">{booking.note}</div> : null}
                    </td>
                    <td className="align-right" data-label="Action">
                      {canDecide && booking.status === 'booked' ? (
                        <span className="row-actions">
                          <button type="button" className="btn-primary btn--sm" disabled={busy}
                            onClick={() => mark(booking, 'attended')}>
                            Attended
                          </button>
                          <button type="button" className="btn-ghost btn--sm" disabled={busy}
                            onClick={() => mark(booking, 'no_show')}>
                            No show
                          </button>
                        </span>
                      ) : booking.status === 'booked' && !canDecide ? (
                        <button type="button" className="btn-ghost btn--sm" disabled={busy}
                          onClick={() => cancel(booking)}>
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
        )}
      </section>
    </>
  );
}
