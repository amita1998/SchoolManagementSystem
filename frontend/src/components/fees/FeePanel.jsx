import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as feesApi from '../../services/fees.js';
import { PageHeader, Notice, StatusBadge } from '../../components/ui/PageHeader.jsx';

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
            <select value={active} onChange={(event) => setActive(event.target.value)} aria-label="Choose child">
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
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
          <section className="stat-row">
            <div className="stat-tile">
              <span>Payable</span>
              <strong>{money(data.totals.payable)}</strong>
            </div>
            <div className="stat-tile">
              <span>Paid</span>
              <strong>{money(data.totals.paid)}</strong>
            </div>
            <div className="stat-tile">
              <span>Outstanding</span>
              <strong className={data.totals.due > 0 ? 'is-due' : ''}>{money(data.totals.due)}</strong>
            </div>
          </section>

          <section className="section-card">
            <div className="section-card__head">
              <h3>Fee breakdown</h3>
            </div>
            {data.rows.length === 0 ? (
              <p className="empty-state">No fee structure has been assigned yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Fee</th>
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

          <section className="section-card">
            <div className="section-card__head">
              <h3>Installments</h3>
            </div>
            {data.installments.length === 0 ? (
              <p className="empty-state">No installments scheduled.</p>
            ) : (
              <ul className="card-list">
                {data.installments.map((item) => (
                  <li key={`${item.structure_name}-${item.seq}`}>
                    <div>
                      <h4>{item.label}</h4>
                      <span className="muted">{item.structure_name}</span>
                    </div>
                    <div className="section-card__stat">
                      <span>Due {item.due_label}</span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section-card">
            <div className="section-card__head">
              <h3>Payment history</h3>
            </div>
            {data.receipts.length === 0 ? (
              <p className="empty-state">No payment recorded yet.</p>
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
    </div>
  );
}
