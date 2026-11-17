import { useCallback, useEffect, useMemo, useState } from 'react';
import * as feesApi from '../../services/fees.js';
import { getClasses, listStudents } from '../../services/admin.js';
import { PageHeader, Notice, StatusBadge, Pagination } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';
import '../../styles/fees.css';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MODES = [
  ['cash', 'Cash'],
  ['cheque', 'Cheque'],
  ['bank_transfer', 'Bank transfer'],
  ['upi', 'UPI'],
  ['card', 'Card'],
];

const PLANS = [
  ['monthly', 'Monthly (12)'],
  ['quarterly', 'Quarterly (4)'],
  ['term', 'Term (3)'],
  ['one_time', 'One time'],
];

const TABS = [
  ['categories', 'Categories'],
  ['structures', 'Structures'],
  ['assignment', 'Assignment'],
  ['payments', 'Payments'],
];

const planLabel = (value) => (PLANS.find(([key]) => key === value) || [null, value])[1];

const MODE_LABELS = Object.fromEntries(MODES);
const modeLabel = (value) => MODE_LABELS[value] || String(value || '').replace(/_/g, ' ');

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminFeesPage() {
  const [tab, setTab] = useState('payments');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  return (
    <div className="page">
      <PageHeader
        title="Fees"
        subtitle="Offline collections only. Receipts are numbered from a database sequence and are never deleted."
      />
      {notice.text && (
        <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>
          {notice.text}
        </Notice>
      )}

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'is-active' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab onNotice={setNotice} />}
      {tab === 'structures' && <StructuresTab onNotice={setNotice} />}
      {tab === 'assignment' && <AssignmentTab onNotice={setNotice} />}
      {tab === 'payments' && <PaymentsTab onNotice={setNotice} />}
    </div>
  );
}

/* ── categories ─────────────────────────────────────────────────────────── */

function CategoriesTab({ onNotice }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    feesApi
      .categories()
      .then(setRows)
      .catch((error) =>
        onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load fee categories.' }),
      );
  }, [onNotice]);

  useEffect(load, [load]);

  async function addCategory(event) {
    event.preventDefault();
    const name = event.target.categoryName.value.trim();
    const code = event.target.categoryCode.value.trim();
    if (!name || !code) return;
    try {
      await feesApi.createCategory({ name, code });
      event.target.reset();
      load();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not add the category.' });
    }
  }

  return (
    <section className="section-card fee-ledger">
      <div className="section-card__head">
        <h3>Fee categories</h3>
        <span className="muted">{rows.length} defined</span>
      </div>

      <form className="fee-inline-form" onSubmit={addCategory}>
        <div className="field">
          <label htmlFor="cat-name">Name</label>
          <input id="cat-name" name="categoryName" placeholder="Transport" />
        </div>
        <div className="field">
          <label htmlFor="cat-code">Code</label>
          <input id="cat-code" name="categoryCode" placeholder="TRN" maxLength={12} />
        </div>
        <button className="btn-primary" type="submit">
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add category
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="table-empty">No fee category yet. Add the first one above.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>
                    <span className="soft-chip soft-chip--mono">{row.code}</span>
                  </td>
                  <td>
                    {row.is_active ? (
                      <StatusBadge status="active" />
                    ) : (
                      <span className="status-badge status-badge--amber">inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── structures ─────────────────────────────────────────────────────────── */

function StructuresTab({ onNotice }) {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', classId: '', categoryId: '', totalAmount: '', installmentPlan: 'quarterly' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([feesApi.structures(), feesApi.categories(), getClasses()])
      .then(([structures, cats, classList]) => {
        setRows(structures);
        setCategories(cats);
        setClasses(classList.classes || classList || []);
      })
      .catch((error) => onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load fee structures.' }));
  }, [onNotice]);

  useEffect(load, [load]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await feesApi.createStructure({ ...form, classId: Number(form.classId), categoryId: Number(form.categoryId), totalAmount: Number(form.totalAmount) });
      onNotice({ kind: 'success', text: 'Fee structure created with its installments.' });
      setForm({ name: '', classId: '', categoryId: '', totalAmount: '', installmentPlan: 'quarterly' });
      load();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not create the structure.' });
    } finally {
      setBusy(false);
    }
  }

  async function assignClass(row) {
    try {
      const result = await feesApi.assign({ structureId: row.id, classId: row.class_id });
      onNotice({ kind: 'success', text: `${result.assigned} student(s) assigned to ${row.name}.` });
      load();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Assignment failed.' });
    }
  }

  return (
    <>
      <section className="section-card">
        <div className="section-card__head">
          <h3>New fee structure</h3>
          <span className="muted">Installments are generated from the plan</span>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Name" htmlFor="st-name">
            <input id="st-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tuition fee 2026-27" required />
          </Field>
          <Field label="Class" htmlFor="st-class">
            <select id="st-class" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} required>
              <option value="">Choose…</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Category" htmlFor="st-cat">
            <select id="st-cat" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
              <option value="">Choose…</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Total (₹)" htmlFor="st-total">
            <input id="st-total" type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => setForm({ ...form, totalAmount: event.target.value })} required />
          </Field>
          <Field label="Installments" htmlFor="st-plan">
            <select id="st-plan" value={form.installmentPlan} onChange={(event) => setForm({ ...form, installmentPlan: event.target.value })}>
              {PLANS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create structure'}</button>
          </div>
        </form>
      </section>

      <section className="section-card fee-ledger">
        <div className="section-card__head">
          <h3>Structures this year</h3>
          <span className="muted">{rows.length} defined</span>
        </div>
        {rows.length === 0 ? (
          <p className="table-empty">No fee structure yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th className="fee-num">Total</th>
                  <th>Plan</th>
                  <th>Assigned</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.class_name}</td>
                    <td>{row.category}</td>
                    <td>
                      {row.name}{' '}
                      {!row.is_active && <span className="status-badge status-badge--amber">inactive</span>}
                    </td>
                    <td className="fee-num fee-num--strong">{money(row.total_amount)}</td>
                    <td>
                      <span className="soft-chip">{planLabel(row.installment_plan)}</span>
                      <span className="fee-cell-note">{row.installments.map((item) => item.label).join(' · ')}</span>
                    </td>
                    <td>
                      <span className="soft-chip">
                        {row.assigned} student{row.assigned === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="align-right">
                      <button className="btn-ghost btn--sm" type="button" onClick={() => assignClass(row)}>
                        Assign class
                      </button>
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

/* ── assignment ─────────────────────────────────────────────────────────── */

function AssignmentTab({ onNotice }) {
  const [rows, setRows] = useState([]);
  const [structureId, setStructureId] = useState('');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    feesApi
      .structures()
      .then(setRows)
      .catch((error) => onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load fee structures.' }));
  }, [onNotice]);

  useEffect(load, [load]);

  useEffect(() => {
    let live = true;
    const search = term.trim();
    if (search.length < 2) {
      setResults([]);
      return () => {};
    }
    const timer = setTimeout(() => {
      listStudents({ search, limit: 8 })
        .then((payload) => live && setResults(payload.rows || []))
        .catch(() => live && setResults([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term]);

  const structure = rows.find((row) => String(row.id) === String(structureId)) || null;

  async function assignClass() {
    if (!structure) return;
    setBusy(true);
    try {
      const result = await feesApi.assign({ structureId: structure.id, classId: structure.class_id });
      onNotice({ kind: 'success', text: `${result.assigned} student(s) assigned to ${structure.name}.` });
      load();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Assignment failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function assignStudent() {
    if (!structure || !student) return;
    setBusy(true);
    try {
      const result = await feesApi.assign({ structureId: structure.id, studentIds: [student.id] });
      onNotice({
        kind: 'success',
        text: `${student.name || `${student.firstName} ${student.lastName}`} assigned to ${structure.name}${
          result?.assigned ? ` (${result.assigned} record)` : ''
        }.`,
      });
      setStudent(null);
      setTerm('');
      setResults([]);
      load();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Assignment failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-card">
      <div className="section-card__head">
        <h3>Assign a structure</h3>
        <span className="muted">One student or a whole class</span>
      </div>

      <div className="section-card__body">
        <div className="field">
          <label htmlFor="assign-structure">Fee structure</label>
          <select
            id="assign-structure"
            value={structureId}
            onChange={(event) => {
              setStructureId(event.target.value);
              setStudent(null);
            }}
          >
            <option value="">Choose…</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.class_name} · {row.category} — {row.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fee-assign__block">
          <div>
            <span className="fee-assign__label">Whole class</span>
            <strong>{structure ? `${structure.class_name} · ${structure.category}` : 'No structure selected'}</strong>
            <div className="fee-assign__meta">
              {structure ? (
                <>
                  <span className="soft-chip">{money(structure.total_amount)}</span>
                  <span className="soft-chip">
                    {structure.assigned} student{structure.assigned === 1 ? '' : 's'} assigned
                  </span>
                </>
              ) : (
                <span className="fee-assign__hint">
                  Pick a structure above to assign every enrolled student in its class.
                </span>
              )}
            </div>
          </div>
          <button className="btn-primary" type="button" onClick={assignClass} disabled={!structure || busy}>
            <i className="bi bi-people" aria-hidden="true" /> Assign to {structure ? structure.class_name : 'class'}
          </button>
        </div>

        <div className="field">
          <label htmlFor="assign-student">Student name or admission ID</label>
          <input
            id="assign-student"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="e.g. Ananya or VVS-0000"
            autoComplete="off"
          />
        </div>

        {results.length > 0 && (
          <ul className="fee-picker">
            {results.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setStudent(item)}>
                  <strong>{item.name || `${item.firstName} ${item.lastName}`}</strong>
                  <span>{item.admissionId} · {item.className || '—'} {item.sectionName || ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {student && (
          <div className="fee-assign__block">
            <div>
              <span className="fee-assign__label">Selected student</span>
              <strong>{student.name || `${student.firstName} ${student.lastName}`}</strong>
              <p>
                {student.admissionId} · {student.className || '—'} {student.sectionName || ''}
              </p>
            </div>
            <button className="btn-primary" type="button" onClick={assignStudent} disabled={!structure || busy}>
              Assign to {student.name || student.firstName}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── payments ───────────────────────────────────────────────────────────── */

function PaymentsTab({ onNotice }) {
  // A reversal posted in the ledger must not leave the student card above showing
  // the pre-reversal balance: bump a token and let the collect section re-read it.
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      <CollectTab onNotice={onNotice} refreshToken={refreshToken} />
      <ReceiptsTab onNotice={onNotice} onReversed={() => setRefreshToken((value) => value + 1)} />
    </>
  );
}

function CollectTab({ onNotice, refreshToken = 0 }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ studentFeeId: '', amount: '', paymentMode: 'cash', referenceNo: '', paidOn: today(), remarks: '' });
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    let live = true;
    const search = term.trim();
    if (search.length < 2) {
      setResults([]);
      return () => {};
    }
    const timer = setTimeout(() => {
      listStudents({ search, limit: 8 })
        .then((payload) => live && setResults(payload.rows || []))
        .catch(() => live && setResults([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term]);

  const load = useCallback((id) => {
    feesApi
      .summary(id)
      .then(setData)
      .catch((error) => onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load fees.' }));
  }, [onNotice]);

  useEffect(() => {
    if (refreshToken > 0 && student) load(student.id);
    // Only a reversal elsewhere should trigger this; `pick` already loads.
  }, [refreshToken]);

  function pick(item) {
    setStudent(item);
    setTerm('');
    setResults([]);
    setData(null);
    setPayOpen(false);
    setForm((current) => ({ ...current, studentFeeId: '', amount: '' }));
    load(item.id);
  }

  function chooseFee(event) {
    const row = data?.rows.find((item) => String(item.id) === event.target.value);
    const due = row ? Number(row.payable_amount) - Number(row.paid) : 0;
    setForm((current) => ({ ...current, studentFeeId: event.target.value, amount: due > 0 ? due.toFixed(2) : '' }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await feesApi.recordPayment({ ...form, studentFeeId: Number(form.studentFeeId) });
      onNotice({ kind: 'success', text: `Receipt ${result.receipt.receipt_no} issued for ${money(result.receipt.amount)}.` });
      setForm({ studentFeeId: '', amount: '', paymentMode: 'cash', referenceNo: '', paidOn: today(), remarks: '' });
      setPayOpen(false);
      load(student.id);
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Payment was not recorded.' });
    } finally {
      setBusy(false);
    }
  }

  const selectedFee = useMemo(
    () => data?.rows.find((row) => String(row.id) === form.studentFeeId) || null,
    [data, form.studentFeeId],
  );

  const studentName = student ? student.name || `${student.firstName} ${student.lastName}` : '';

  return (
    <>
      <section className="section-card">
        <div className="section-card__head">
          <h3>Find a student</h3>
          <span className="muted">Search every class</span>
        </div>
        <div className="section-card__body">
          <div className="field">
            <label htmlFor="fee-student">Name or admission ID</label>
            <input id="fee-student" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="e.g. Ananya or VVS-0000" autoComplete="off" />
          </div>
          {results.length > 0 && (
            <ul className="fee-picker">
              {results.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick(item)}>
                    <strong>{item.name || `${item.firstName} ${item.lastName}`}</strong>
                    <span>{item.admissionId} · {item.className || '—'} {item.sectionName || ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {student && data && (
        <>
          <section className="section-card fee-ledger">
            <div className="section-card__head">
              <h3>
                {studentName} <span className="mono">{student.admissionId}</span>
              </h3>
              <button className="btn-primary" type="button" onClick={() => setPayOpen(true)} disabled={data.rows.length === 0}>
                <i className="bi bi-receipt-cutoff" aria-hidden="true" /> Record payment
              </button>
            </div>

            <div className="summary-chips fee-summary">
              <span className="summary-chip">
                <strong>{money(data.totals.payable)}</strong> payable
              </span>
              <span className="summary-chip summary-chip--paid">
                <strong>{money(data.totals.paid)}</strong> paid
              </span>
              <span className={data.totals.due > 0 ? 'summary-chip summary-chip--due' : 'summary-chip'}>
                <strong>{money(data.totals.due)}</strong> due
              </span>
            </div>

            {data.rows.length === 0 ? (
              <p className="empty-state">No fee structure is assigned to this student yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Fee</th>
                      <th className="fee-num">Gross</th>
                      <th className="fee-num">Concession</th>
                      <th className="fee-num">Payable</th>
                      <th className="fee-num">Paid</th>
                      <th className="fee-num">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => {
                      const due = Number(row.payable_amount) - Number(row.paid);
                      const settled = due <= 0;
                      const conceded = Number(row.concession_amount) > 0;
                      return (
                        <tr key={row.id}>
                          <td>{row.category}</td>
                          <td>{row.structure_name}</td>
                          <td className={conceded ? 'fee-num fee-num--zero' : 'fee-num'}>{money(row.gross_amount)}</td>
                          <td className={conceded ? 'fee-num fee-num--due' : 'fee-num fee-num--zero'}>{money(row.concession_amount)}</td>
                          <td className="fee-num fee-num--strong">{money(row.payable_amount)}</td>
                          <td className={settled ? 'fee-num fee-num--settled' : 'fee-num'}>{money(row.paid)}</td>
                          <td className={settled ? 'fee-num fee-num--settled' : 'fee-num fee-num--due'}>{money(due)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card fee-ledger">
            <div className="section-card__head">
              <h3>Receipts</h3>
              <span className="muted">{data.receipts.length} issued</span>
            </div>
            {data.receipts.length === 0 ? (
              <p className="table-empty">No payments recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Date</th>
                      <th className="fee-num">Amount</th>
                      <th>Mode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          <span className="fee-receipt">{receipt.receipt_no}</span>
                        </td>
                        <td>
                          <span className="fee-date">{receipt.issued_on}</span>
                        </td>
                        <td className="fee-num fee-num--strong">{money(receipt.amount)}</td>
                        <td>
                          <span className="soft-chip">{modeLabel(receipt.payment_mode)}</span>
                        </td>
                        <td>
                          {receipt.is_reversed ? (
                            <span className="status-badge status-badge--coral">reversed</span>
                          ) : (
                            <StatusBadge status="active" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {payOpen && (
            <div className="fee-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fee-pay-title">
              <div className="fee-modal">
                <div className="fee-modal__head">
                  <div>
                    <h3 id="fee-pay-title">Record a payment</h3>
                    <p>
                      {studentName} · {student.admissionId}
                    </p>
                  </div>
                  <button className="fee-modal__close" type="button" onClick={() => setPayOpen(false)} aria-label="Close">
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </div>

                <form onSubmit={submit}>
                  <div className="fee-modal__body">
                    <div className="form-grid">
                      <Field label="Fee" htmlFor="fee-row" className="form-grid__full">
                        <select id="fee-row" value={form.studentFeeId} onChange={chooseFee} required>
                          <option value="">Choose…</option>
                          {data.rows.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.category} — due {money(Number(row.payable_amount) - Number(row.paid))}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Amount (₹)" htmlFor="fee-amount">
                        <input id="fee-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
                      </Field>
                      <Field label="Mode" htmlFor="fee-mode">
                        <select id="fee-mode" value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}>
                          {MODES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Reference" htmlFor="fee-reference" hint="Required for everything except cash.">
                        <input id="fee-reference" value={form.referenceNo} onChange={(event) => setForm({ ...form, referenceNo: event.target.value })} />
                      </Field>
                      <Field label="Paid on" htmlFor="fee-date">
                        <input id="fee-date" type="date" value={form.paidOn} max={today()} onChange={(event) => setForm({ ...form, paidOn: event.target.value })} required />
                      </Field>
                      <Field label="Remarks" htmlFor="fee-remarks" className="form-grid__full">
                        <input id="fee-remarks" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
                      </Field>
                    </div>
                  </div>

                  <div className="fee-modal__foot">
                    <span>
                      {selectedFee
                        ? `Due ${money(Number(selectedFee.payable_amount) - Number(selectedFee.paid))}`
                        : 'Choose a fee to continue'}
                    </span>
                    <button className="btn-ghost" type="button" onClick={() => setPayOpen(false)}>Cancel</button>
                    <button className="btn-primary" type="submit" disabled={busy || !form.studentFeeId || !form.amount}>
                      {busy ? 'Saving…' : `Collect${selectedFee ? ` ${money(form.amount)}` : ''}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ReceiptsTab({ onNotice, onReversed = () => {} }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [summary, setSummary] = useState({ collected: 0, reversals: 0 });
  const [filters, setFilters] = useState({ from: '', to: '', search: '', page: 1 });
  const [reversing, setReversing] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    feesApi
      .payments(filters)
      .then((payload) => {
        setRows(payload.rows);
        setMeta(payload.meta);
        setSummary(payload.summary);
      })
      .catch((error) => onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load receipts.' }));
  }, [filters, onNotice]);

  useEffect(load, [load]);

  async function reverse(id) {
    try {
      await feesApi.reversePayment(id, reason);
      onNotice({ kind: 'success', text: 'Reversal posted. The original receipt stays in the ledger.' });
      setReversing(null);
      setReason('');
      load();
      onReversed();
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not reverse.' });
    }
  }

  const target = rows.find((row) => row.id === reversing) || null;

  return (
    <>
      <section className="stat-grid stat-grid--three">
        <div className="stat-tile">
          <span className="stat-tile__label">Collected</span>
          <strong className="stat-tile__value">{money(summary.collected)}</strong>
          <span className="stat-tile__hint">In the selected range</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Reversals</span>
          <strong className="stat-tile__value">{summary.reversals}</strong>
          <span className="stat-tile__hint">Entries posted against receipts</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Entries</span>
          <strong className="stat-tile__value">{meta.total}</strong>
          <span className="stat-tile__hint">Payments and reversals</span>
        </div>
      </section>

      <section className="section-card fee-ledger">
        <div className="section-card__head">
          <h3>Payment ledger</h3>
          <span className="report-count">rows: {meta.total}</span>
        </div>

        <div className="filters finance-filters">
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })}
            aria-label="From"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })}
            aria-label="To"
          />
          <div className="filters__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              placeholder="Receipt, name or admission ID"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
              aria-label="Search receipts"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="table-empty">No payments in this range.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Fee</th>
                  <th>Mode</th>
                  <th className="fee-num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.is_reversal ? 'fee-reversal-row' : ''}>
                    <td>
                      {row.receipt_no ? (
                        <span className="fee-receipt">{row.receipt_no}</span>
                      ) : (
                        <span className="soft-chip">reversal</span>
                      )}
                    </td>
                    <td>
                      <span className="fee-date">{row.paid_on}</span>
                    </td>
                    <td>
                      {row.student_name} <span className="muted">{row.admission_id}</span>
                    </td>
                    <td>
                      {row.category}
                      <span className="fee-cell-note">{row.structure_name}</span>
                    </td>
                    <td>
                      <span className="soft-chip">{modeLabel(row.payment_mode)}</span>
                    </td>
                    <td className={row.is_reversal ? 'fee-num fee-num--due' : 'fee-num fee-num--strong'}>{money(row.amount)}</td>
                    <td className="align-right">
                      {row.is_reversal && <span className="status-badge status-badge--amber">reversal</span>}
                      {row.is_reversed && <span className="status-badge status-badge--coral">reversed</span>}
                      {!row.is_reversal && !row.is_reversed && (
                        <button className="btn-ghost btn--sm" type="button" onClick={() => setReversing(row.id)}>
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination meta={meta} onPage={(page) => setFilters({ ...filters, page })} />
      </section>

      {reversing && (
        <div className="fee-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fee-reverse-title">
          <div className="fee-modal">
            <div className="fee-modal__head">
              <div>
                <h3 id="fee-reverse-title">Reverse this payment</h3>
                <p>
                  {target
                    ? `${target.receipt_no || 'Reversal'} · ${money(target.amount)} · ${target.student_name}`
                    : 'A reversal entry is posted; nothing is deleted.'}
                </p>
              </div>
              <button className="fee-modal__close" type="button" onClick={() => setReversing(null)} aria-label="Close">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="fee-modal__body">
              <div className="fee-modal__note">
                <i className="bi bi-info-circle" aria-hidden="true" />
                <span>A reversal entry is posted; nothing is deleted and the receipt stays numbered.</span>
              </div>
              <div className="field">
                <label htmlFor="reverse-reason">Reason</label>
                <input
                  id="reverse-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={5}
                  placeholder="e.g. Cheque returned by the bank"
                />
                <p className="field-hint">At least 5 characters. The reason is written to the audit log.</p>
              </div>
            </div>

            <div className="fee-modal__foot">
              <span>{reason.trim().length < 5 ? `${reason.trim().length} of 5 characters` : 'Ready to post'}</span>
              <button className="btn-ghost" type="button" onClick={() => setReversing(null)}>Cancel</button>
              <button className="btn-danger" type="button" disabled={reason.trim().length < 5} onClick={() => reverse(reversing)}>
                Post reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
