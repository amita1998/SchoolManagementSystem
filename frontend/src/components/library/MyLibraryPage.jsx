import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import MyBooks from '../../components/library/MyBooks.jsx';
import * as library from '../../services/library.js';

/** Student / teacher view: the books this account currently holds and its history. */
export default function MyLibraryPage({ roleLabel = 'your' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  const load = useCallback(async () => {
    try {
      setRows(await library.getMyBooks());
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load your books.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page library-page">
      <PageHeader
        title="Library"
        subtitle={`Books issued to ${roleLabel} account, with due dates and any fine.`}
      />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>
      <section className="section-card">
        <div className="section-card__head">
          <h3>Borrowed books</h3>
          <span className="muted">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
        </div>
        <MyBooks rows={rows} loading={loading} />
      </section>
    </div>
  );
}
