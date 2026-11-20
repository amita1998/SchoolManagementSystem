import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';
import * as library from '../../services/library.js';
import * as admin from '../../services/admin.js';

/**
 * Library: catalogue + circulation.
 *
 * Two tabs, because the office does two different jobs here — adding books, and handing them
 * out / taking them back. The return button carries the fine the server computed, so the clerk
 * never has to calculate overdue days in their head.
 */
const TABS = ['Catalogue', 'Loans'];

export default function LibraryPage() {
  const [tab, setTab] = useState('Catalogue');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [books, setBooks] = useState({ rows: [], meta: null, categories: [] });
  const [loans, setLoans] = useState({ rows: [], meta: null });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({ students: [], teachers: [] });
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', category: 'General', totalCopies: 1, shelf: '',
  });
  const [newLoan, setNewLoan] = useState({ bookId: '', member: '', loanDays: 14 });
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const fail = (error) =>
    setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Something went wrong.' });

  const loadBooks = useCallback(async () => {
    try {
      const data = await library.getBooks({ search, limit: 50 });
      setBooks(data);
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadLoans = useCallback(async () => {
    try {
      const data = await library.getIssues({ limit: 50, ...(onlyOverdue ? { status: 'issued', overdue: 'true' } : {}) });
      setLoans(data);
    } catch (error) {
      fail(error);
    }
  }, [onlyOverdue]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (tab !== 'Loans') return;
    loadLoans();
    (async () => {
      try {
        const [students, teachers] = await Promise.all([
          admin.listStudents({ limit: 100 }),
          admin.listTeachers({ limit: 100 }),
        ]);
        setOptions({ students: students.rows || [], teachers: teachers.rows || [] });
      } catch {
        /* pickers stay empty; the notice from loadLoans already explains a real failure */
      }
    })();
  }, [tab, loadLoans]);

  async function addBook(event) {
    event.preventDefault();
    try {
      await library.createBook({
        title: newBook.title,
        author: newBook.author || null,
        isbn: newBook.isbn || null,
        category: newBook.category || 'General',
        totalCopies: Number(newBook.totalCopies) || 1,
        shelf: newBook.shelf || null,
      });
      setNotice({ kind: 'success', text: `Added “${newBook.title}”.` });
      setNewBook({ title: '', author: '', isbn: '', category: 'General', totalCopies: 1, shelf: '' });
      loadBooks();
    } catch (error) {
      fail(error);
    }
  }

  async function handOut(event) {
    event.preventDefault();
    const [kind, id] = String(newLoan.member).split(':');
    try {
      await library.issueBook({
        bookId: Number(newLoan.bookId),
        ...(kind === 'student' ? { studentId: Number(id) } : { teacherId: Number(id) }),
        loanDays: Number(newLoan.loanDays) || 14,
      });
      setNotice({ kind: 'success', text: 'Book issued.' });
      setNewLoan({ bookId: '', member: '', loanDays: 14 });
      loadBooks();
      loadLoans();
    } catch (error) {
      fail(error);
    }
  }

  async function takeBack(loan) {
    try {
      const done = await library.returnBook(loan.id, {});
      const fine = Number(done.fine_amount);
      setNotice({
        kind: fine > 0 ? 'warning' : 'success',
        text: fine > 0
          ? `Returned “${loan.title}” — fine ₹${fine.toFixed(2)} (${loan.days_overdue} day(s) late).`
          : `Returned “${loan.title}”. No fine.`,
      });
      loadBooks();
      loadLoans();
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="page library-page">
      <PageHeader
        title="Library"
        subtitle="Catalogue, issue and return. Fines are calculated from the school's daily rate."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item}
            className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Catalogue' && (
        <div className="academics-layout">
          <section className="section-card">
            <div className="section-card__head">
              <h3>Books</h3>
              <span className="muted">{books.meta ? `${books.meta.total} titles` : ''}</span>
            </div>
            <div className="attendance-toolbar">
              <Field label="Search" name="librarySearch" value={search} placeholder="Title, author or ISBN"
                onChange={(event) => setSearch(event.target.value)} />
            </div>

            {loading ? (
              <div className="loading-block"><div className="skeleton skeleton--table" /></div>
            ) : books.rows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><i className="bi bi-book" aria-hidden="true" /></span>
                <strong>No books yet</strong>
                <span>Add the first title in the panel beside this table.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th className="align-right">Copies</th>
                      <th className="align-right">On loan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.rows.map((book) => (
                      <tr key={book.id}>
                        <td data-label="Title">
                          <strong>{book.title}</strong>
                          {book.isbn ? <div className="muted mono">{book.isbn}</div> : null}
                        </td>
                        <td data-label="Author">{book.author || <span className="muted">—</span>}</td>
                        <td data-label="Category">{book.category}</td>
                        <td className="align-right num" data-label="Copies">
                          {book.available_copies}/{book.total_copies}
                        </td>
                        <td className="align-right num" data-label="On loan">{book.on_loan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card academics-side">
            <div className="section-card__head">
              <h3>Add a book</h3>
              <span className="muted">New title</span>
            </div>
            <form className="stack" onSubmit={addBook}>
              <Field label="Title" name="title" value={newBook.title} required
                onChange={(event) => setNewBook((c) => ({ ...c, title: event.target.value }))} />
              <Field label="Author" name="author" value={newBook.author}
                onChange={(event) => setNewBook((c) => ({ ...c, author: event.target.value }))} />
              <Field label="ISBN" name="isbn" value={newBook.isbn} hint="Optional, unique when filled."
                onChange={(event) => setNewBook((c) => ({ ...c, isbn: event.target.value }))} />
              <Field label="Category" name="category" value={newBook.category}
                onChange={(event) => setNewBook((c) => ({ ...c, category: event.target.value }))} />
              <Field label="Copies" name="totalCopies" type="number" min="1" max="999"
                value={newBook.totalCopies}
                onChange={(event) => setNewBook((c) => ({ ...c, totalCopies: event.target.value }))} />
              <Field label="Shelf" name="shelf" value={newBook.shelf}
                onChange={(event) => setNewBook((c) => ({ ...c, shelf: event.target.value }))} />
              <button type="submit" className="btn-primary btn--block" disabled={!newBook.title}>
                Add book
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === 'Loans' && (
        <div className="academics-layout">
          <section className="section-card">
            <div className="section-card__head">
              <h3>Loans</h3>
              <label className="check">
                <input type="checkbox" checked={onlyOverdue}
                  onChange={(event) => setOnlyOverdue(event.target.checked)} />
                <span>Overdue only</span>
              </label>
            </div>

            {loans.rows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><i className="bi bi-journal-arrow-up" aria-hidden="true" /></span>
                <strong>No loans{onlyOverdue ? ' overdue' : ''}</strong>
                <span>Issue a book from the panel beside this table.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Member</th>
                      <th>Issued</th>
                      <th>Due</th>
                      <th className="align-right">Late</th>
                      <th className="align-right">Fine</th>
                      <th className="col-actions align-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.rows.map((loan) => (
                      <tr key={loan.id}>
                        <td data-label="Book"><strong>{loan.title}</strong></td>
                        <td data-label="Member">
                          {loan.member_name}
                          <div className="muted mono">{loan.member_code}{loan.class_name ? ` · ${loan.class_name}` : ''}</div>
                        </td>
                        <td data-label="Issued">{loan.issued_label}</td>
                        <td data-label="Due">{loan.due_label}</td>
                        <td className="align-right num" data-label="Late">{loan.days_overdue}</td>
                        <td className="align-right num" data-label="Fine">
                          {Number(loan.fine_amount) > 0 ? `₹${Number(loan.fine_amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="align-right" data-label="Action">
                          {loan.status === 'issued' ? (
                            <button type="button" className="btn-ghost btn--sm" onClick={() => takeBack(loan)}>
                              Return
                            </button>
                          ) : (
                            <span className="badge badge--muted">{loan.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card academics-side">
            <div className="section-card__head">
              <h3>Issue a book</h3>
              <span className="muted">Hand over a copy</span>
            </div>
            <form className="stack" onSubmit={handOut}>
              <Select label="Book" name="book" value={newLoan.bookId} placeholder="Select a title"
                options={books.rows
                  .filter((book) => book.available_copies > 0)
                  .map((book) => ({ value: book.id, label: `${book.title} (${book.available_copies} free)` }))}
                onChange={(event) => setNewLoan((c) => ({ ...c, bookId: event.target.value }))} />
              <Select label="Member" name="member" value={newLoan.member} placeholder="Student or teacher"
                options={[
                  ...options.students.map((row) => ({
                    value: `student:${row.id}`,
                    label: [
                      row.admission_id || row.admissionId || row.admission_no || '',
                      row.student_name || row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
                    ].filter(Boolean).join(' · '),
                  })),
                  ...options.teachers.map((row) => ({
                    value: `teacher:${row.id}`,
                    label: `Teacher · ${row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim()}`,
                  })),
                ]}
                onChange={(event) => setNewLoan((c) => ({ ...c, member: event.target.value }))} />
              <Field label="Loan days" name="loanDays" type="number" min="1" max="180" value={newLoan.loanDays}
                hint="Due date = today + this many days."
                onChange={(event) => setNewLoan((c) => ({ ...c, loanDays: event.target.value }))} />
              <button type="submit" className="btn-primary btn--block"
                disabled={!newLoan.bookId || !newLoan.member}>
                Issue book
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
