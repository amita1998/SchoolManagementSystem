import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as examsApi from '../../services/exams.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';

/**
 * Report card for one exam: subject-wise marks, totals and the grade.
 * Students pass studentId="me"; parents pass the selected child's id.
 */
export default function ResultsPage({ studentId = 'me', title = 'Results', childPicker = false }) {
  const [exams, setExams] = useState([]);
  const [selected, setSelected] = useState('');
  const [card, setCard] = useState(null);
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(studentId);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    if (!childPicker) return;
    api
      .get('/dashboard/parent')
      .then(({ data }) => {
        const kids = data.data.children || [];
        setChildren(kids);
        if (kids.length) setActiveChild(String(kids[0].id));
      })
      .catch(() => setNotice({ kind: 'error', text: 'Could not load your children.' }));
  }, [childPicker]);

  useEffect(() => {
    if (!activeChild) return;
    setCard(null);
    setSelected('');
    examsApi
      .studentExams(activeChild)
      .then((list) => {
        setExams(list);
        if (list.length) setSelected(String(list[0].id));
      })
      .catch((error) =>
        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load results.' }),
      );
  }, [activeChild]);

  useEffect(() => {
    if (!selected || !activeChild) return;
    examsApi
      .reportCard(activeChild, selected)
      .then(setCard)
      .catch((error) =>
        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the report card.' }),
      );
  }, [selected, activeChild]);

  return (
    <div className="page">
      <PageHeader title={title} subtitle="Published examinations only. Grades follow the school scale." />

      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {childPicker && children.length > 1 && (
        <div className="child-switcher">
          {children.map((child) => (
            <button key={child.id} type="button"
              className={`child-chip ${String(child.id) === String(activeChild) ? 'is-active' : ''}`}
              onClick={() => setActiveChild(String(child.id))}>
              <span className="child-chip__avatar">{child.name.charAt(0)}</span>
              <span>
                <strong>{child.name}</strong>
                <small>{child.className} {child.section}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {exams.length === 0 ? (
        <Notice kind="info">No results have been published yet.</Notice>
      ) : (
        <>
          <div className="filters">
            <label className="form-field">
              <span>Examination</span>
              <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} {exam.published_on ? `· ${exam.published_on}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {card && (
            <section className="section-card">
              <header className="section-card__head">
                <div>
                  <h3>{card.exam.name}</h3>
                  <p>
                    {card.student.name} · {card.class?.class_name} {card.class?.section_name} ·{' '}
                    {card.student.admission_id}
                  </p>
                </div>
                <div className="result-total">
                  <strong>{card.totals.percentage}%</strong>
                  <span>
                    {card.totals.obtained} / {card.totals.maximum} · grade {card.totals.grade || '—'}
                  </span>
                  {card.rank && <span>Rank {card.rank.position} of {card.rank.of}</span>}
                </div>
              </header>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Subject</th><th>Max</th><th>Marks</th><th>Grade</th></tr>
                  </thead>
                  <tbody>
                    {card.papers.map((paper) => (
                      <tr key={paper.subject_name}>
                        <td>{paper.subject_name}</td>
                        <td>{Number(paper.max_marks)}</td>
                        <td>{paper.is_absent ? 'Absent' : paper.marks_obtained === null ? '—' : Number(paper.marks_obtained)}</td>
                        <td>{paper.grade || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
