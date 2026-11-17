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
      <PageHeader
        title="Settings"
        subtitle={`Academic year ${data.settings.academic_year || '—'} · ${data.settings.timezone} · ${data.settings.currency}`}
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      <form className="settings-form" onSubmit={submit}>
        <section className="section-card settings-card">
          <div className="section-card__head">
            <h3>
              <i className="bi bi-building" aria-hidden="true" /> School identity
            </h3>
            <span className="muted">Printed on receipts and reports</span>
          </div>
          <p className="settings-card__intro">
            The name, tagline and contact details the school shows on every document it issues.
          </p>
          <div className="form-grid">
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
            <Field label="Address" htmlFor="se-address" className="form-grid__full">
              <textarea id="se-address" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
          </div>
        </section>

        <section className="section-card settings-card">
          <div className="section-card__head">
            <h3>
              <i className="bi bi-clock-history" aria-hidden="true" /> Attendance rules
            </h3>
            <span className="muted">{data.settings.timezone}</span>
          </div>
          <p className="settings-card__intro">
            Class teachers can mark attendance until the closing time. After it the register for that day is locked.
          </p>
          <div className="form-grid">
            <Field label="Attendance closes at" htmlFor="se-lock" hint="Class teachers can mark until this time.">
              <input id="se-lock" type="time" value={form.attendanceLockTime} onChange={(event) => setForm({ ...form, attendanceLockTime: event.target.value })} />
            </Field>
          </div>
        </section>

        <section className="section-card settings-card">
          <div className="section-card__head">
            <h3>
              <i className="bi bi-eye" aria-hidden="true" /> Visibility
            </h3>
            <span className="muted">Students and parents</span>
          </div>
          <p className="settings-card__intro">
            What a student can see about money after signing in. Parents always see their own child&apos;s ledger.
          </p>
          <label className="check-block">
            <input
              type="checkbox"
              checked={form.feeVisibleToStudents}
              onChange={(event) => setForm({ ...form, feeVisibleToStudents: event.target.checked })}
            />
            <span>
              Let students see their own fees (off by default)
              <small>Leave this off and the fee screens stay hidden from student accounts.</small>
            </span>
          </label>
        </section>

        <section className="section-card settings-card">
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
                          <i className="bi bi-check-circle-fill perm-yes" role="img" aria-label="allowed" />
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

        <div className="settings-savebar">
          <span className="settings-savebar__hint">
            <i className="bi bi-info-circle" aria-hidden="true" /> Saved changes apply to every screen immediately.
          </span>
          <div className="settings-savebar__actions">
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
