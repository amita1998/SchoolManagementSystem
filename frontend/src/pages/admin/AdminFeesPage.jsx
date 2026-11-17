import { useCallback, useEffect, useMemo, useState } from 'react';
import * as feesApi from '../../services/fees.js';
import { getClasses, listStudents } from '../../services/admin.js';
import { PageHeader, Notice, StatusBadge } from '../../components/ui/PageHeader.jsx';
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

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminFeesPage() {
  const [tab, setTab] = useState('collect');
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
        {[
          ['collect', 'Collect'],
          ['structures', 'Structures'],
          ['receipts', 'Receipts'],
        ].map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'collect' && <CollectTab onNotice={setNotice} />}
      {tab === 'structures' && <StructuresTab onNotice={setNotice} />}
      {tab === 'receipts' && <ReceiptsTab onNotice={setNotice} />}
    </div>
  );
}

function CollectTab({ onNotice }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ studentFeeId: '', amount: '', paymentMode: 'cash', referenceNo: '', paidOn: today(), remarks: '' });
  const [busy, setBusy] = useState(false);

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

  function pick(item) {
    setStudent(item);
    setTerm('');
    setResults([]);
    setData(null);
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

  return (
    <>
      <section className="section-card">
        <div className="section-card__head">
          <h3>Find a student</h3>
        </div>
        <div className="field">
          <label htmlFor="fee-student">Name or admission ID</label>
          <input id="fee-student" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="e.g. Ananya or VVS-0000" autoComplete="off" />
        </div>
        {results.length > 0 && (
          <ul className="picker">
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
      </section>

      {student && data && (
        <>
          <section className="section-card">
            <div className="section-card__head">
              <h3>
                {student.name || `${student.firstName} ${student.lastName}`}{' '}
                <span className="muted">{student.admissionId}</span>
              </h3>
              <div className="section-card__stat">
                <span>Payable {money(data.totals.payable)}</span>
                <span>Paid {money(data.totals.paid)}</span>
                <strong>Due {money(data.totals.due)}</strong>
              </div>
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
                      <th>Gross</th>
                      <th>Concession</th>
                      <th>Payable</th>
                      <th>Paid</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => {
                      const due = Number(row.payable_amount) - Number(row.paid);
                      return (
                        <tr key={row.id}>
                          <td>{row.category}</td>
                          <td>{row.structure_name}</td>
                          <td>{money(row.gross_amount)}</td>
                          <td>{money(row.concession_amount)}</td>
                          <td>{money(row.payable_amount)}</td>
                          <td>{money(row.paid)}</td>
                          <td className={due > 0 ? 'is-due' : ''}>{money(due)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.rows.length > 0 && (
            <section className="section-card">
              <div className="section-card__head">
                <h3>Record a payment</h3>
              </div>
              <form className="form-grid" onSubmit={submit}>
                <Field label="Fee" htmlFor="fee-row">
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
                <Field label="Remarks" htmlFor="fee-remarks">
                  <input id="fee-remarks" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
                </Field>
                <div className="form-actions">
                  <button className="btn btn--primary" type="submit" disabled={busy || !form.studentFeeId || !form.amount}>
                    {busy ? 'Saving…' : `Collect${selectedFee ? ` ${money(form.amount)}` : ''}`}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="section-card">
            <div className="section-card__head">
              <h3>Receipts</h3>
            </div>
            {data.receipts.length === 0 ? (
              <p className="empty-state">No payments recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>{receipt.receipt_no}</td>
                        <td>{receipt.issued_on}</td>
                        <td>{money(receipt.amount)}</td>
                        <td>{receipt.payment_mode}</td>
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
        </>
      )}
    </>
  );
}

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
            <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create structure'}</button>
          </div>
        </form>

        <form className="inline-form" onSubmit={addCategory}>
          <span>Add a category:</span>
          <input name="categoryName" placeholder="Transport" aria-label="Category name" />
          <input name="categoryCode" placeholder="TRN" aria-label="Category code" maxLength={12} />
          <button className="btn btn--ghost" type="submit">Add</button>
        </form>
      </section>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Structures this year</h3>
        </div>
        {rows.length === 0 ? (
          <p className="empty-state">No fee structure yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Total</th>
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
                    <td>{row.name}</td>
                    <td>{money(row.total_amount)}</td>
                    <td className="muted">{row.installments.map((item) => item.label).join(' · ')}</td>
                    <td>{row.assigned}</td>
                    <td className="row-actions">
                      <button className="btn btn--ghost btn--sm" type="button" onClick={() => assignClass(row)}>
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

function ReceiptsTab({ onNotice }) {
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
    } catch (error) {
      onNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not reverse.' });
    }
  }

  return (
    <>
      <section className="stat-row">
        <div className="stat-tile">
          <span>Collected</span>
          <strong>{money(summary.collected)}</strong>
        </div>
        <div className="stat-tile">
          <span>Reversals</span>
          <strong>{summary.reversals}</strong>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Ledger</h3>
        </div>
        <div className="filter-row">
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value, page: 1 })} aria-label="From" />
          <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value, page: 1 })} aria-label="To" />
          <input
            placeholder="Receipt, name or admission ID"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value, page: 1 })}
          />
        </div>

        {rows.length === 0 ? (
          <p className="empty-state">No payments in this range.</p>
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
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.is_reversal ? 'is-muted' : ''}>
                    <td>{row.receipt_no || <span className="muted">reversal</span>}</td>
                    <td>{row.paid_on}</td>
                    <td>
                      {row.student_name} <span className="muted">{row.admission_id}</span>
                    </td>
                    <td>{row.category}</td>
                    <td>{row.payment_mode}</td>
                    <td className={row.is_reversal ? 'is-due' : ''}>{money(row.amount)}</td>
                    <td className="row-actions">
                      {!row.is_reversal && !row.is_reversed && (
                        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setReversing(row.id)}>
                          Reverse
                        </button>
                      )}
                      {row.is_reversed && <span className="muted">reversed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.pages > 1 && (
          <div className="pagination">
            <button type="button" disabled={meta.page <= 1} onClick={() => setFilters({ ...filters, page: meta.page - 1 })}>Prev</button>
            <span className="pagination__meta">Page {meta.page} of {meta.pages} · {meta.total} entries</span>
            <button type="button" disabled={meta.page >= meta.pages} onClick={() => setFilters({ ...filters, page: meta.page + 1 })}>Next</button>
          </div>
        )}
      </section>

      {reversing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Reverse this payment</h3>
            <p className="muted">A reversal entry is posted; nothing is deleted and the receipt stays numbered.</p>
            <div className="field">
              <label htmlFor="reverse-reason">Reason</label>
              <input id="reverse-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} />
            </div>
            <div className="form-actions">
              <button className="btn btn--ghost" type="button" onClick={() => setReversing(null)}>Cancel</button>
              <button className="btn btn--danger" type="button" disabled={reason.trim().length < 5} onClick={() => reverse(reversing)}>
                Post reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
