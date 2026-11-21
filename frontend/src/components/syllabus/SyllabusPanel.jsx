import { useCallback, useEffect, useMemo, useState } from 'react';
import Field, { Select } from '../forms/Field.jsx';
import { PageHeader, Notice } from '../ui/PageHeader.jsx';
import * as syllabus from '../../services/syllabus.js';
import { api } from '../../services/api.js';
import { todayISO } from '../../utils/schoolDate.js';

/**
 * Chapter-wise syllabus + exam portion, one screen for four roles.
 *
 * mode 'admin'   — every (class, subject): add/edit chapters, set the portion of any paper
 * mode 'teacher' — the (class, subject) pairs they teach; ticks chapters covered, sets the portion
 * mode 'student' — own class, read-only: chapters, progress and what each exam will cover
 * mode 'parent'  — one child at a time, same read-only view
 */

const BLANK_CHAPTER = { chapterNo: '', title: '', description: '' };

export default function SyllabusPanel({ mode = 'student' }) {
  const canManage = mode === 'admin' || mode === 'teacher';
  const isParent = mode === 'parent';

  const [pairs, setPairs] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [progress, setProgress] = useState({ total: 0, covered: 0, percent: 0 });
  const [papers, setPapers] = useState([]);
  const [paperId, setPaperId] = useState('');
  const [picked, setPicked] = useState([]);
  const [form, setForm] = useState(BLANK_CHAPTER);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    if (!canManage) return;
    syllabus.getPairs()
      .then((rows) => {
        setPairs(rows);
        if (rows.length > 0) setClassId(String(rows[0].class_id));
      })
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load your classes.' }));
  }, [canManage]);

  useEffect(() => {
    if (!isParent) return;
    api.get('/dashboard/parent')
      .then(({ data }) => {
        const kids = data.data.children || [];
        setChildren(kids);
        if (kids.length === 1) setChildId(String(kids[0].id));
      })
      .catch(() => setChildren([]));
  }, [isParent]);

  const classOptions = useMemo(() => {
    const map = new Map();
    for (const pair of pairs) map.set(pair.class_id, pair.class_name);
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [pairs]);

  const subjectOptions = useMemo(
    () => pairs
      .filter((pair) => String(pair.class_id) === String(classId))
      .map((pair) => ({ value: pair.subject_id, label: pair.subject_name })),
    [pairs, classId],
  );

  useEffect(() => {
    if (!canManage || !classId) return;
    const first = pairs.find((pair) => String(pair.class_id) === String(classId));
    if (!first) return;
    const stillValid = pairs.some(
      (pair) => String(pair.class_id) === String(classId) && String(pair.subject_id) === String(subjectId),
    );
    if (!stillValid) setSubjectId(String(first.subject_id));
  }, [canManage, classId, pairs, subjectId]);

  const loadChapters = useCallback(async () => {
    try {
      const params = {};
      if (canManage && classId) params.classId = Number(classId);
      if (canManage && subjectId) params.subjectId = Number(subjectId);
      if (isParent && childId) params.childId = Number(childId);
      const data = await syllabus.getChapters(params);
      setChapters(data.rows);
      setProgress(data.progress);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the syllabus.' });
    } finally {
      setLoading(false);
    }
  }, [canManage, classId, subjectId, isParent, childId]);

  const loadPortions = useCallback(async () => {
    try {
      const params = {};
      if (isParent && childId) params.childId = Number(childId);
      const data = await syllabus.getPortions(params);
      setPapers(data.rows);
    } catch {
      setPapers([]);
    }
  }, [isParent, childId]);

  useEffect(() => { loadChapters(); }, [loadChapters]);
  useEffect(() => { loadPortions(); }, [loadPortions]);

  const editablePapers = useMemo(
    () => papers.filter(
      (paper) => String(paper.class_id) === String(classId) && String(paper.subject_id) === String(subjectId),
    ),
    [papers, classId, subjectId],
  );

  const activePaper = editablePapers.find((paper) => String(paper.schedule_id) === String(paperId)) || null;

  useEffect(() => {
    if (!canManage) return;
    if (editablePapers.length === 0) {
      setPaperId('');
      setPicked([]);
      return;
    }
    if (!editablePapers.some((paper) => String(paper.schedule_id) === String(paperId))) {
      setPaperId(String(editablePapers[0].schedule_id));
    }
  }, [canManage, editablePapers, paperId]);

  useEffect(() => {
    if (!activePaper) return;
    setPicked(activePaper.chapters.map((chapter) => chapter.chapter_id));
  }, [activePaper]);

  async function addChapter(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await syllabus.createChapter({
        classId: Number(classId),
        subjectId: Number(subjectId),
        chapterNo: Number(form.chapterNo),
        title: form.title,
        description: form.description || null,
      });
      setForm(BLANK_CHAPTER);
      setNotice({ kind: 'success', text: 'Chapter added.' });
      await loadChapters();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not add the chapter.' });
    } finally {
      setBusy(false);
    }
  }

  async function toggleCovered(chapter) {
    setBusy(true);
    try {
      await syllabus.updateChapter(chapter.id, { coveredOn: chapter.covered_on ? null : todayISO() });
      await loadChapters();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not update the chapter.' });
    } finally {
      setBusy(false);
    }
  }

  async function removeChapter(chapter) {
    setBusy(true);
    try {
      await syllabus.deleteChapter(chapter.id);
      setNotice({ kind: 'success', text: `Chapter ${chapter.chapter_no} removed.` });
      await loadChapters();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove the chapter.' });
    } finally {
      setBusy(false);
    }
  }

  async function savePortion(event) {
    event.preventDefault();
    if (!paperId) return;
    setBusy(true);
    try {
      await syllabus.setPortion(Number(paperId), picked);
      setNotice({ kind: 'success', text: 'Exam portion saved.' });
      // the chapter table carries a per-chapter portion count, so it has to reload too
      await Promise.all([loadPortions(), loadChapters()]);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save the portion.' });
    } finally {
      setBusy(false);
    }
  }

  function togglePicked(chapterId) {
    setPicked((current) => (
      current.includes(chapterId) ? current.filter((id) => id !== chapterId) : [...current, chapterId]
    ));
  }

  const nextChapterNo = chapters.length
    ? Math.max(...chapters.map((row) => row.chapter_no)) + 1
    : 1;

  const title = {
    admin: 'Syllabus',
    teacher: 'Syllabus',
    student: 'My syllabus',
    parent: 'Syllabus',
  }[mode];

  return (
    <div className="page syllabus-page">
      <PageHeader
        title={title}
        subtitle={canManage
          ? 'Chapter by chapter, and what each exam paper will cover.'
          : 'What the class has covered, and what each exam will ask.'}
      />
      {notice.text ? <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice> : null}

      {canManage ? (
        <div className="filter-row">
          <Select label="Class" name="classId" value={classId} options={classOptions}
            onChange={(event) => setClassId(event.target.value)} />
          <Select label="Subject" name="subjectId" value={subjectId} options={subjectOptions}
            onChange={(event) => setSubjectId(event.target.value)} />
        </div>
      ) : null}

      {isParent && children.length > 1 ? (
        <div className="filter-row">
          <Select label="Child" name="childId" value={childId}
            options={children.map((child) => ({ value: child.id, label: `${child.name} · ${child.admissionId}` }))}
            onChange={(event) => setChildId(event.target.value)} />
        </div>
      ) : null}

      <div className="summary-chips syllabus-progress">
        <span className="summary-chip">
          <strong>{progress.covered}</strong> of {progress.total} chapters covered
        </span>
        <span className="summary-chip">
          <strong>{progress.percent}%</strong> done
        </span>
        <span className="syllabus-bar" aria-hidden="true">
          <span style={{ width: `${progress.percent}%` }} />
        </span>
      </div>

      <div className="syllabus-layout">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Chapters</h3>
            <span className="muted">{chapters.length} total</span>
          </div>
          {loading ? <div className="loading-block"><div className="skeleton skeleton--table" /></div> : null}
          {!loading && chapters.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-journal-text" aria-hidden="true" /></span>
              <strong>No chapters yet</strong>
              <span>{canManage ? 'Add the first chapter on the right.' : 'The teacher has not published the syllabus yet.'}</span>
            </div>
          ) : null}
          {!loading && chapters.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Chapter</th><th>Covered</th><th>Portions</th>
                    {canManage ? <th className="align-right">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((chapter) => (
                    <tr key={chapter.id}>
                      <td data-label="#" className="mono">{chapter.chapter_no}</td>
                      <td data-label="Chapter">
                        <strong>{chapter.title}</strong>
                        <div className="muted">
                          {chapter.subject_name}
                          {chapter.class_name ? ` · ${chapter.class_name}` : ''}
                          {chapter.stream_name ? ` · ${chapter.stream_name}` : ''}
                        </div>
                        {chapter.description ? <div className="muted">{chapter.description}</div> : null}
                      </td>
                      <td data-label="Covered">
                        <span className={`status-badge ${chapter.covered_on ? 'status-badge--mint' : 'status-badge--blue'}`}>
                          {chapter.covered_on ? chapter.covered_label : 'Not yet'}
                        </span>
                      </td>
                      <td data-label="Portions" className="mono">{chapter.portions}</td>
                      {canManage ? (
                        <td className="align-right" data-label="Action">
                          <span className="row-actions">
                            <button type="button" className="btn-ghost btn--sm" disabled={busy}
                              onClick={() => toggleCovered(chapter)}>
                              {chapter.covered_on ? 'Undo covered' : 'Mark covered'}
                            </button>
                            <button type="button" className="btn-ghost btn--sm" disabled={busy}
                              onClick={() => removeChapter(chapter)}>
                              Remove
                            </button>
                          </span>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="syllabus-side">
          {canManage ? (
            <section className="section-card">
              <div className="section-card__head"><h3>Add a chapter</h3></div>
              <form className="form-grid" onSubmit={addChapter}>
                <Field label="Chapter no." name="chapterNo" type="number" min="1" required
                  value={form.chapterNo} placeholder={String(nextChapterNo)} hint={`Next: ${nextChapterNo}`}
                  onChange={(event) => setForm((current) => ({ ...current, chapterNo: event.target.value }))} />
                <Field label="Title" name="title" required value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                <Field label="Note" name="description" value={form.description} hint="Optional — topics inside the chapter."
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                <button type="submit" className="btn-primary" disabled={busy || !classId || !subjectId}>
                  Add chapter
                </button>
              </form>
            </section>
          ) : null}

          <section className="section-card">
            <div className="section-card__head">
              <h3>{canManage ? 'Exam portion' : 'What each exam covers'}</h3>
              <span className="muted">{papers.length} papers</span>
            </div>

            {canManage && editablePapers.length > 0 ? (
              <form className="syllabus-portion" onSubmit={savePortion}>
                <Select label="Exam paper" name="paper" value={paperId}
                  options={editablePapers.map((paper) => ({
                    value: paper.schedule_id,
                    label: `${paper.exam_name} · ${paper.class_name} ${paper.subject_name} · ${paper.exam_date_label}`,
                  }))}
                  onChange={(event) => setPaperId(event.target.value)} />
                <div className="syllabus-checklist">
                  {chapters.map((chapter) => (
                    <label key={chapter.id} className="syllabus-checklist__row">
                      <input type="checkbox" checked={picked.includes(chapter.id)}
                        onChange={() => togglePicked(chapter.id)} />
                      <span className="mono">{chapter.chapter_no}</span>
                      <span>{chapter.title}</span>
                    </label>
                  ))}
                </div>
                <p className="muted">{picked.length} chapter(s) in this paper</p>
                <button type="submit" className="btn-primary" disabled={busy || !paperId}>Save portion</button>
              </form>
            ) : null}

            {canManage && editablePapers.length === 0 ? (
              <p className="muted">No exam paper for this class and subject yet — the admin adds papers under Examinations.</p>
            ) : null}

            {!canManage ? (
              papers.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon"><i className="bi bi-clipboard-check" aria-hidden="true" /></span>
                  <strong>No exam portion yet</strong>
                  <span>It appears once the school publishes an exam for this class.</span>
                </div>
              ) : (
                <div className="syllabus-portions">
                  {papers.map((paper) => (
                    <article key={paper.schedule_id} className="syllabus-portion-card">
                      <header>
                        <strong>{paper.exam_name}</strong>
                        <span className="muted">{paper.class_name} · {paper.subject_name} · {paper.exam_date_label}</span>
                      </header>
                      {paper.chapters.length === 0 ? (
                        <p className="muted">No portion set for this paper.</p>
                      ) : (
                        <ol className="syllabus-portion-list">
                          {paper.chapters.map((chapter) => (
                            <li key={chapter.chapter_id}>
                              <span className="mono">{chapter.chapter_no}</span> {chapter.title}
                              {chapter.covered_on ? <span className="status-badge status-badge--mint">covered</span> : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  ))}
                </div>
              )
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
