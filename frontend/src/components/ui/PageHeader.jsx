import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, backTo, actions }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {backTo && (
          <Link className="page-head__back" to={backTo}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back
          </Link>
        )}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

const STATUS_TONE = {
  active: 'mint',
  new_admission: 'blue',
  promoted: 'blue',
  academic_year_renewed: 'blue',
  graduated: 'purple',
  transferred: 'coral',
  withdrawn: 'coral',
  suspended: 'coral',
  on_leave: 'purple',
  resigned: 'coral',
};

export function StatusBadge({ status }) {
  const label = String(status || '').replace(/_/g, ' ');
  return <span className={`status-badge status-badge--${STATUS_TONE[status] || 'blue'}`}>{label}</span>;
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  const pages = [];
  const from = Math.max(1, meta.page - 2);
  const to = Math.min(meta.pages, from + 4);
  for (let page = from; page <= to; page += 1) pages.push(page);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Prev
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={page === meta.page ? 'is-active' : ''}
          onClick={() => onPage(page)}
        >
          {page}
        </button>
      ))}
      <button type="button" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
      <span className="pagination__meta">
        {meta.total} record{meta.total === 1 ? '' : 's'}
      </span>
    </nav>
  );
}

export function Notice({ kind = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice--${kind}`} role="alert">
      <i className={`bi ${kind === 'error' ? 'bi-exclamation-circle' : kind === 'success' ? 'bi-check-circle' : 'bi-info-circle'}`} aria-hidden="true" />
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss">
          <i className="bi bi-x" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default PageHeader;
