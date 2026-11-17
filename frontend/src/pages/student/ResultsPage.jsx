import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as examsApi from '../../services/exams.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const GRADE_TONE = { A: 'mint', B: 'blue', C: 'amber', D: 'amber', E: 'coral', F: 'coral' };

function gradeTone(grade) {
  return GRADE_TONE[String(grade || '').charAt(0).toUpperCase()] || 'blue';
}

/**
 * Report card for one exam: subject-wise marks, totals and the grade.
 * Students pass studentId="me"; parents pass the selected child's id.
 */
export default function ResultsPage({ studentId = 'me', title = 'Results', childPicker = false }) {
  const [exams, setExams] = useState([]);
  const [selected, setSelected] = useState('');
  const [card, setCard] = useState(null);
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(childPicker ? '' : studentId);
  const [childrenLoaded, setChildrenLoaded] = useState(!childPicker);
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
      .catch(() => setNotice({ kind: 'error', text: 'Could not load your children.' }))
      .finally(() => setChildrenLoaded(true));
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

  const waitingForChild = childPicker && !childrenLoaded;
  const noChild = childPicker && childrenLoaded && children.length === 0;

  return (
    <div className="page">
      <PageHeader title={title} subtitle="Published examinations only. Grades follow the school scale." />

      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {childPicker && children.length > 1 && (
        <div className="child-switcher" role="tablist" aria-label="Select child">
          {children.map((child) => (
            <button key={child.id} type="button"
              role="tab"
              aria-selected={String(child.id) === String(activeChild)}
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

      {waitingForChild ? (
        <section className="section-card">
          <div className="loading-block" aria-hidden="true">
            <div className="skeleton skeleton--table" />
          </div>
        </section>
      ) : noChild ? (
        <section className="section-card">
          <EmptyState
            icon="bi-person-plus"
            title="No child linked to this account"
            text="Ask the school office to link your child's record to this login, then their report cards appear here."
          />
        </section>
      ) : exams.length === 0 ? (
        <section className="section-card">
          <EmptyState
            icon="bi-clipboard-x"
            title="No published results yet"
            text="A report card appears here once the exam office publishes the examination. Unpublished exams stay hidden until then."
          />
        </section>
      ) : (
        <section className="section-card">
          <div className="section-card__head">
            <div>
              <h3>{card ? card.exam.name : 'Report card'}</h3>
              <span className="muted">
                {card
                  ? `${card.student.name} · ${card.class?.class_name || '—'} ${card.class?.section_name || ''} · ${card.student.admission_id}`
                  : 'Choose an examination to open its report card.'}
              </span>
            </div>
            <div className="form-field">
              <label htmlFor="results-exam">Examination</label>
              <select id="results-exam" value={selected} onChange={(event) => setSelected(event.target.value)}>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} {exam.published_on ? `· ${exam.published_on}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!card ? (
            <div className="loading-block" aria-hidden="true">
              <div className="skeleton skeleton--table" />
            </div>
          ) : (
            <div className="section-card__body">
              <div className="stat-row">
                <div>
                  <strong>{card.totals.percentage}%</strong>
                  <span>Overall</span>
                </div>
                <div>
                  <strong>
                    {card.totals.obtained}/{card.totals.maximum}
                  </strong>
                  <span>Marks</span>
                </div>
                <div>
                  <strong>{card.totals.grade || '—'}</strong>
                  <span>Grade</span>
                </div>
                {card.rank && (
                  <div>
                    <strong>
                      {card.rank.position} of {card.rank.of}
                    </strong>
                    <span>Rank</span>
                  </div>
                )}
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th className="align-right">Max</th>
                      <th className="align-right">Marks</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.papers.map((paper) => (
                      <tr key={paper.subject_name}>
                        <td data-label="Subject">{paper.subject_name}</td>
                        <td data-label="Max" className="align-right mono">{Number(paper.max_marks)}</td>
                        <td data-label="Marks" className="align-right mono">
                          {paper.is_absent ? 'Absent' : paper.marks_obtained === null ? '—' : Number(paper.marks_obtained)}
                        </td>
                        <td data-label="Grade">
                          {paper.grade ? (
                            <span className={`status-badge status-badge--${gradeTone(paper.grade)}`}>{paper.grade}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
