import { useEffect, useState } from 'react';
import * as ops from '../../services/ops.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';

export default function AdminSettingsPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ops
      .settings()
      .then((payload) => {
        setData(payload);
        setForm({
          schoolName: payload.settings.school_name || '',
          tagline: payload.settings.tagline || '',
          address: payload.settings.address || '',
          phone: payload.settings.phone || '',
          email: payload.settings.email || '',
          website: payload.settings.website || '',
          feeVisibleToStudents: Boolean(payload.settings.fee_visible_to_students),
          attendanceLockTime: payload.settings.attendance_lock_time || '23:59',
        });
      })
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load settings.' }));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await ops.saveSettings(form);
      setNotice({ kind: 'success', text: 'Settings saved.' });
      const refreshed = await ops.settings();
      setData(refreshed);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save.' });
    } finally {
      setBusy(false);
    }
  }

  if (!data || !form) {
    return (
      <div className="page">
        <PageHeader title="Settings" />
        {notice.text ? <Notice kind={notice.kind}>{notice.text}</Notice> : <p className="empty-state">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle={`Academic year ${data.settings.academic_year || '—'} · ${data.settings.timezone} · ${data.settings.currency}`} />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      <section className="section-card">
        <div className="section-card__head">
          <h3>School information</h3>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Field label="School name" htmlFor="se-name">
            <input id="se-name" value={form.schoolName} onChange={(event) => setForm({ ...form, schoolName: event.target.value })} required />
          </Field>
          <Field label="Tagline" htmlFor="se-tagline">
            <input id="se-tagline" value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="se-phone">
            <input id="se-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Email" htmlFor="se-email">
            <input id="se-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Website" htmlFor="se-site">
            <input id="se-site" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </Field>
          <Field label="Attendance closes at" htmlFor="se-lock" hint="Class teachers can mark until this time.">
            <input id="se-lock" type="time" value={form.attendanceLockTime} onChange={(event) => setForm({ ...form, attendanceLockTime: event.target.value })} />
          </Field>
          <Field label="Address" htmlFor="se-address" className="form-grid__full">
            <textarea id="se-address" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </Field>
          <div className="form-actions">
            <label className="check">
              <input
                type="checkbox"
                checked={form.feeVisibleToStudents}
                onChange={(event) => setForm({ ...form, feeVisibleToStudents: event.target.checked })}
              />
              Let students see their own fees (off by default)
            </label>
            <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Role permissions</h3>
          <span className="muted">read only</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission</th>
                {data.permissions.roles.map((role) => (
                  <th key={role}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.permissions.labels).map(([permission, label]) => (
                <tr key={permission}>
                  <td>{label}</td>
                  {data.permissions.roles.map((role) => (
                    <td key={role}>
                      {data.permissions.matrix[role].includes(permission) ? (
                        <i className="bi bi-check-circle-fill" style={{ color: '#5f6db0' }} aria-label="allowed" />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
