import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as feesApi from '../../services/fees.js';
import { PageHeader, Notice, StatusBadge } from '../../components/ui/PageHeader.jsx';
import '../../styles/fees.css';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Read-only fee view for a student (`self`) or a parent's selected child. */
export default function FeePanel({ studentId = null, childPicker = false, self = false }) {
  const [children, setChildren] = useState([]);
  const [active, setActive] = useState(self ? 'me' : studentId || '');
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    if (!childPicker) return;
    api
      .get('/dashboard/parent')
      .then(({ data: payload }) => {
        const kids = payload.data.children || [];
        setChildren(kids);
        if (kids.length) setActive(String(kids[0].id));
        else setNotice({ kind: 'error', text: 'No child is linked to this account yet.' });
      })
      .catch(() => setNotice({ kind: 'error', text: 'Could not load your children.' }));
  }, [childPicker]);

  const load = useCallback((id) => {
    if (!id) return;
    feesApi
      .summary(id)
      .then(setData)
      .catch((error) =>
        setNotice({
          kind: 'error',
          text: error.response?.data?.error?.message || 'Fee details could not be loaded.',
        }),
      );
  }, []);

  useEffect(() => {
    load(active);
  }, [active, load]);

  return (
    <div className="page">
      <PageHeader
        title="Fees"
        subtitle="Offline payments recorded by the school office. Amounts are in rupees."
        actions={
          childPicker && children.length > 1 ? (
            <select
              className="fee-child-select"
              value={active}
              onChange={(event) => setActive(event.target.value)}
              aria-label="Choose child"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          ) : null
        }
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {!data ? (
        <p className="empty-state">
          {notice.kind === 'error' ? 'Fee details are not available on this page.' : 'Loading…'}
        </p>
      ) : (
        <>
          <section className="stat-grid stat-grid--three">
            <div className="stat-tile">
              <span className="stat-tile__label">Payable</span>
              <strong className="stat-tile__value">{money(data.totals.payable)}</strong>
              <span className="stat-tile__hint">After concession</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">Paid</span>
              <strong className="stat-tile__value">{money(data.totals.paid)}</strong>
              <span className="stat-tile__hint">Receipted by the office</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">Outstanding</span>
              <strong className={data.totals.due > 0 ? 'stat-tile__value fee-num fee-num--due' : 'stat-tile__value fee-num'}>
                {money(data.totals.due)}
              </strong>
              <span className="stat-tile__hint">{data.totals.due > 0 ? 'Balance to collect' : 'Fully settled'}</span>
            </div>
          </section>

          {/**
            * Payment status in words, and the three ways a family can clear the year.
            * Parents asked for exactly this: "half payment done / full payment done" plus a
            * choice of 1 (full), 2 (half-yearly) or 4 (quarterly) payments.
            */}
          {(() => {
            const payable = Number(data.totals.payable || 0);
            const paid = Number(data.totals.paid || 0);
            const ratio = payable > 0 ? paid / payable : 0;
            const status =
              ratio >= 0.999
                ? { label: 'Full payment done', tone: 'is-ok' }
                : ratio >= 0.45
                  ? { label: 'Half payment done', tone: 'is-warn' }
                  : ratio > 0
                    ? { label: 'Part payment done', tone: 'is-info' }
                    : { label: 'No payment yet', tone: 'is-danger' };
            const perHalf = Math.round((payable / 2) * 100) / 100;
            const perQuarter = Math.round((payable / 4) * 100) / 100;
            return (
              <>
                <div className={`fee-status-bar ${status.tone}`} role="status">
                  <strong>{status.label}</strong>
                  <span className="muted">
                    {money(paid)} paid of {money(payable)} · {money(Math.max(0, payable - paid))} left
                  </span>
                </div>

                <section className="section-card fee-options">
                  <div className="section-card__head">
                    <h3>How you can pay</h3>
                    <span className="muted">Pay at the school office — every payment gets a receipt</span>
                  </div>
                  <ul className="fee-option-list">
                    <li>
                      <strong>Full payment</strong>
                      <span>1 payment of {money(payable)}</span>
                    </li>
                    <li>
                      <strong>Half payment</strong>
                      <span>2 payments of {money(perHalf)} (June &amp; December)</span>
                    </li>
                    <li>
                      <strong>Quarterly payment</strong>
                      <span>4 payments of {money(perQuarter)}</span>
                    </li>
                  </ul>
                </section>
              </>
            );
          })()}

          <section className="section-card fee-ledger">
            <div className="section-card__head">
              <h3>Fee breakdown</h3>
              <span className="muted">{data.rows.length} head{data.rows.length === 1 ? '' : 's'}</span>
            </div>
            {data.rows.length === 0 ? (
              <p className="table-empty">No fee structure has been assigned yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Fee</th>
                      <th className="fee-num">Payable</th>
                      <th className="fee-num">Paid</th>
                      <th className="fee-num">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => {
                      const due = Number(row.payable_amount) - Number(row.paid);
                      const settled = due <= 0;
                      return (
                        <tr key={row.id}>
                          <td>{row.category}</td>
                          <td>{row.structure_name}</td>
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

          <section className="section-card">
            <div className="section-card__head">
              <h3>Installments</h3>
              <span className="muted">{data.installments.length} scheduled</span>
            </div>
            {data.installments.length === 0 ? (
              <p className="table-empty">No installments scheduled.</p>
            ) : (
              <ul className="fee-installments">
                {data.installments.map((item) => (
                  <li key={`${item.structure_name}-${item.seq}`}>
                    <div>
                      <h4>{item.label}</h4>
                      <span>{item.structure_name}</span>
                    </div>
                    <div>
                      <span className="fee-date">Due {item.due_label}</span>
                      <strong className="fee-installments__amount">{money(item.amount)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section-card fee-ledger">
            <div className="section-card__head">
              <h3>Payment history</h3>
              <span className="muted">{data.receipts.length} receipt{data.receipts.length === 1 ? '' : 's'}</span>
            </div>
            {data.receipts.length === 0 ? (
              <p className="table-empty">No payment recorded yet.</p>
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
                          <span className="soft-chip">{receipt.payment_mode}</span>
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
        </>
      )}
    </div>
  );
}
