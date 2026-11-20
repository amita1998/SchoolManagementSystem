import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/forms/Field.jsx';
import MyBooks from '../../components/library/MyBooks.jsx';
import { api } from '../../services/api.js';
import * as library from '../../services/library.js';

/**
 * Parents hold no library account of their own — they look at a child's loans, one child at a
 * time. The child list comes from the parent dashboard payload, and the server re-checks that
 * the chosen child really belongs to this parent.
 */
export default function ParentLibraryPage() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/dashboard/parent');
        const list = data.data?.children || [];
        setChildren(list);
        if (list.length) setChildId(String(list[0].id));
        else setLoading(false);
      } catch (error) {
        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load your children.' });
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      setRows(await library.getMyBooks({ childId }));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the library record.' });
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page library-page">
      <PageHeader title="Library" subtitle="Books issued to your child, with due dates and any fine." />
      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Borrowed books</h3>
          {children.length > 1 && (
            <Select label="Child" name="libraryChild" value={childId}
              options={children.map((child) => ({
                value: child.id,
                label: `${child.name || `${child.first_name || ''} ${child.last_name || ''}`.trim()} · ${child.admissionId || child.admission_id || ''}`,
              }))}
              onChange={(event) => setChildId(event.target.value)} />
          )}
        </div>
        <MyBooks rows={rows} loading={loading} emptyHint="Your child has not borrowed any book yet." />
      </section>
    </div>
  );
}
