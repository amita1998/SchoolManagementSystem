import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, StatusBadge, Notice } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/forms/Field.jsx';
import { formatDate } from '../../utils/greeting.js';

const STATUS_OPTIONS = [
  'active',
  'new_admission',
  'promoted',
  'academic_year_renewed',
  'graduated',
  'transferred',
  'withdrawn',
  'suspended',
].map((value) => ({ value, label: value.replace(/_/g, ' ') }));

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [state, setState] = useState('loading');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [statusForm, setStatusForm] = useState({
    status: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });
  const [credentials, setCredentials] = useState(null);
  const [files, setFiles] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await admin.getStudent(id);
      setStudent(data);
      setState('ready');
    } catch (error) {
      setState('error');
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the student.' });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') return <p className="table-empty">Loading student…</p>;
  if (!student) return <Notice kind="error">{notice.text}</Notice>;

  async function applyStatus(event) {
    event.preventDefault();
    if (!statusForm.status) return;
    try {
      await admin.changeStudentStatus(id, statusForm);
      setNotice({ kind: 'success', text: 'Status updated and recorded in the history.' });
      setStatusForm((current) => ({ ...current, status: '', remarks: '' }));
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not change the status.' });
    }
  }

  async function resetPassword() {
    try {
      const result = await admin.resetStudentPassword(id);
      setCredentials(result);
      setNotice({ kind: 'success', text: 'A new temporary password was generated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not reset the password.' });
    }
  }

  async function remove() {
    if (!window.confirm('Remove this student? Records stay in the database (soft delete).')) return;
    try {
      await admin.deleteStudent(id);
      navigate('/admin/students');
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove the student.' });
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!files.length) return;
    try {
      await admin.addStudentDocuments(
        id,
        Array.from(files).map((file) => ({ file, docType: file.name.replace(/\.[^.]+$/, '') })),
      );
      setFiles([]);
      event.target.reset();
      setNotice({ kind: 'success', text: 'Documents uploaded.' });
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Upload failed.' });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={student.name}
        subtitle={`Admission ${student.admissionId} · ${student.className || 'not enrolled'} ${student.sectionName || ''}`}
        backTo="/admin/students"
        actions={
          <>
            <StatusBadge status={student.status} />
            <button type="button" className="btn-ghost" onClick={resetPassword}>
              Reset password
            </button>
            <button type="button" className="btn-danger" onClick={remove}>
              Remove
            </button>
          </>
        }
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>
        {notice.text}
      </Notice>

      {credentials && (
        <Notice kind="success">
          Login <strong className="mono">{credentials.username}</strong> · temporary password{' '}
          <strong className="mono">{credentials.temporaryPassword}</strong> (shown once)
        </Notice>
      )}

      <div className="dash__grid">
        <section className="section-card">
          <h3>Profile</h3>
          <dl className="profile-facts">
            <div><dt>Admission ID</dt><dd className="mono">{student.admissionId}</dd></div>
            <div><dt>Date of birth</dt><dd>{formatDate(student.dateOfBirth)}</dd></div>
            <div><dt>Gender</dt><dd>{student.gender}</dd></div>
            <div><dt>Blood group</dt><dd>{student.bloodGroup || '—'}</dd></div>
            <div><dt>Admission date</dt><dd>{formatDate(student.admissionDate)}</dd></div>
            <div><dt>Previous school</dt><dd>{student.previousSchool || '—'}</dd></div>
            <div><dt>Login</dt><dd>{student.login?.username || 'No account'}</dd></div>
            <div>
              <dt>Login status</dt>
              <dd>{student.login ? (student.login.is_active ? 'Active' : 'Disabled') : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="section-card">
          <h3>Change status</h3>
          <form onSubmit={applyStatus} className="stack">
            <Select label="New status" name="status" value={statusForm.status} placeholder="Select status"
              onChange={(e) => setStatusForm((c) => ({ ...c, status: e.target.value }))}
              options={STATUS_OPTIONS} />
            <label className="form-field">
              <span>Effective date</span>
              <input type="date" value={statusForm.effectiveDate}
                onChange={(e) => setStatusForm((c) => ({ ...c, effectiveDate: e.target.value }))} />
            </label>
            <label className="form-field">
              <span>Remarks</span>
              <input type="text" value={statusForm.remarks} placeholder="Reason (kept in history)"
                onChange={(e) => setStatusForm((c) => ({ ...c, remarks: e.target.value }))} />
            </label>
            <button type="submit" className="btn-primary" disabled={!statusForm.status}>
              Apply status
            </button>
          </form>
        </section>
      </div>

      <div className="dash__grid">
        <section className="section-card">
          <h3>Parents / guardians</h3>
          {student.parents.length === 0 ? (
            <p className="table-empty">No guardian linked.</p>
          ) : (
            <ul className="people-list">
              {student.parents.map((parent) => (
                <li key={parent.id}>
                  <span className="people-list__avatar">{parent.full_name.charAt(0)}</span>
                  <div>
                    <strong>{parent.full_name}</strong>
                    <span>
                      {parent.relationship} · {parent.mobile}
                      {parent.email ? ` · ${parent.email}` : ''}
                    </span>
                    <span>
                      {[parent.address_line, parent.city, parent.state, parent.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span className={`status-badge status-badge--${parent.user_id ? 'mint' : 'coral'}`}>
                    {parent.user_id ? 'account' : 'no account'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
          <h3>Status history</h3>
          {student.statusHistory.length === 0 ? (
            <p className="table-empty">No changes yet.</p>
          ) : (
            <ul className="timeline">
              {student.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span className="timeline__dot" />
                  <div>
                    <strong>
                      {String(entry.from_status || 'new').replace(/_/g, ' ')} →{' '}
                      {String(entry.to_status).replace(/_/g, ' ')}
                    </strong>
                    <span>
                      {formatDate(entry.effective_date)}
                      {entry.changed_by ? ` · ${entry.changed_by}` : ''}
                    </span>
                    {entry.remarks && <span className="muted">{entry.remarks}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section-card">
        <h3>Documents</h3>
        {student.documents.length === 0 ? (
          <p className="table-empty">No documents uploaded.</p>
        ) : (
          <ul className="file-list">
            {student.documents.map((document) => (
              <li key={document.id}>
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
                <a href={admin.documentUrl(document.id)} target="_blank" rel="noreferrer">
                  {document.file_name}
                </a>
                <span className="muted">{document.doc_type.replace(/_/g, ' ')}</span>
                <span className="muted">{Math.round(document.size_bytes / 1024)} KB</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={upload} className="inline-form">
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => setFiles(event.target.files || [])} />
          <button type="submit" className="btn-ghost" disabled={!files.length}>
            Upload
          </button>
          <span className="field-hint">PDF, JPG, PNG · max 5 MB each</span>
        </form>
      </section>
    </div>
  );
}
