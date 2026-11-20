import { Link } from 'react-router-dom';

/**
 * "My books" list shared by student, teacher and parent.
 * Only the data source differs per role; the table is the same, so it lives in one place.
 */
export default function MyBooks({ rows, emptyHint, loading = false }) {
  if (loading) {
    return <div className="loading-block"><div className="skeleton skeleton--table" /></div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__icon"><i className="bi bi-book" aria-hidden="true" /></span>
        <strong>No books borrowed</strong>
        <span>{emptyHint || 'Ask the library desk to issue a book.'}</span>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Book</th>
            <th>Category</th>
            <th>Issued</th>
            <th>Due</th>
            <th className="align-right">Status</th>
            <th className="align-right">Fine</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const overdue = row.status === 'issued' && Number(row.days_overdue) > 0;
            return (
              <tr key={row.id} className={overdue ? 'is-overdue' : ''}>
                <td data-label="Book">
                  <strong>{row.title}</strong>
                  {row.author ? <div className="muted">{row.author}</div> : null}
                </td>
                <td data-label="Category">{row.category}</td>
                <td data-label="Issued">{row.issued_label}</td>
                <td data-label="Due">{row.due_label}</td>
                <td className="align-right" data-label="Status">
                  {row.status === 'issued' ? (
                    overdue ? <span className="badge badge--danger">{row.days_overdue}d late</span>
                            : <span className="badge badge--ok">On loan</span>
                  ) : (
                    <span className="badge badge--muted">Returned</span>
                  )}
                </td>
                <td className="align-right num" data-label="Fine">
                  {Number(row.fine_amount) > 0 ? `₹${Number(row.fine_amount).toFixed(2)}` : '—'}
                  {Number(row.fine_amount) > 0 && !row.fine_paid ? (
                    <div className="muted">unpaid</div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted library-hint">
        Library desk se baat karein agar koi book ya fine galat lage. <Link to="/">Dashboard</Link>
      </p>
    </div>
  );
}
