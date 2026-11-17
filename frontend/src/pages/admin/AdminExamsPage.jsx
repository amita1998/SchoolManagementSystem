import { useEffect, useState } from 'react';
import * as examsApi from '../../services/exams.js';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice, StatusBadge } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit test' },
  { value: 'mid_term', label: 'Mid term' },
  { value: 'final', label: 'Final' },
  { value: 'practical', label: 'Practical' },
  { value: 'internal_assessment', label: 'Internal assessment' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminExamsPage() {
  const [examList, setExamList] = useState([]);
  const [options, setOptions] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ name: '', examType: 'unit_test', startDate: today(), endDate: today() });
  const [schedule, setSchedule] = useState({
    classId: '',
    subjectId: '',
    examDate: today(),
    startTime: '09:00',
    endTime: '10:30',
    maxMarks: 100,
  });

  async function load() {
    try {
      const [list, opts] = await Promise.all([examsApi.listExams(), admin.getOptions()]);
      setExamList(list);
      setOptions(opts);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load exams.' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openExam(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    try {
      setOpenId(id);
      setDetail(await examsApi.getExam(id));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not open the exam.' });
    }
  }

  async function refreshDetail() {
    if (!openId) return;
    setDetail(await examsApi.getExam(openId));
    await load();
  }

  return (
    <div className="page">
      <PageHeader
        title="Examinations"
        subtitle="Create exams, schedule papers, and publish results when every mark is in."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        <h3>New exam</h3>
        <div className="form-grid">
          <Field label="Name" value={form.name} placeholder="Term II Examination"
            onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
          <Select label="Type" value={form.examType}
            onChange={(event) => setForm((c) => ({ ...c, examType: event.target.value }))}
            options={EXAM_TYPES} />
          <Field label="Start date" type="date" value={form.startDate}
            onChange={(event) => setForm((c) => ({ ...c, startDate: event.target.value }))} />
          <Field label="End date" type="date" value={form.endDate}
            onChange={(event) => setForm((c) => ({ ...c, endDate: event.target.value }))} />
        </div>
        <div className="wizard-actions">
          <button type="button" className="btn-primary" disabled={!form.name || form.name.length < 2}
            onClick={async () => {
              try {
                await examsApi.createExam(form);
                setForm({ name: '', examType: 'unit_test', startDate: today(), endDate: today() });
                setNotice({ kind: 'success', text: 'Exam created.' });
                load();
              } catch (error) {
                setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not create the exam.' });
              }
            }}>
            Create exam
          </button>
        </div>
      </section>

      {examList.length === 0 && <p className="table-empty">No exams yet.</p>}

      {examList.map((exam) => (
        <section className="section-card" key={exam.id}>
          <header className="section-card__head">
            <div>
              <h3>
                {exam.name}{' '}
                <span className={`status-badge status-badge--${exam.publish_status === 'published' ? 'mint' : 'blue'}`}>
                  {exam.publish_status}
                </span>
              </h3>
              <p>
                {exam.exam_type.replace(/_/g, ' ')} · {exam.start_label} → {exam.end_label} ·{' '}
                {exam.schedule_count} paper(s) · {exam.class_count} class(es)
              </p>
            </div>
            <div className="inline-form">
              <button type="button" className="btn-ghost" onClick={() => openExam(exam.id)}>
                {openId === exam.id ? 'Close' : 'Manage'}
              </button>
              <button type="button" className={exam.publish_status === 'published' ? 'btn-danger' : 'btn-primary'}
                onClick={async () => {
                  try {
                    await examsApi.publish(exam.id, exam.publish_status !== 'published');
                    setNotice({
                      kind: 'success',
                      text: exam.publish_status === 'published' ? 'Exam unpublished.' : 'Results published.',
                    });
                    await load();
                    await refreshDetail();
                  } catch (error) {
                    setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not publish.' });
                  }
                }}>
                {exam.publish_status === 'published' ? 'Unpublish' : 'Publish results'}
              </button>
            </div>
          </header>

          {openId === exam.id && detail && (
            <>
              {detail.schedules.length === 0 ? (
                <p className="table-empty">No papers scheduled yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th><th>Class</th><th>Subject</th><th>Time</th>
                        <th>Max</th><th>Marks</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.schedules.map((paper) => (
                        <tr key={paper.id}>
                          <td>{paper.date_label}</td>
                          <td>{paper.class_name}</td>
                          <td>{paper.subject_name}</td>
                          <td>{paper.start_time}–{paper.end_time}</td>
                          <td>{Number(paper.max_marks)}</td>
                          <td>
                            {paper.marks_entered}/{paper.student_count}
                            {paper.marks_entered === paper.student_count && paper.student_count > 0 && (
                              <i className="bi bi-check2-circle text-mint" aria-hidden="true" />
                            )}
                          </td>
                          <td className="align-right">
                            <button type="button" className="link-button"
                              onClick={async () => {
                                if (!window.confirm('Remove this paper?')) return;
                                try {
                                  await examsApi.removeSchedule(exam.id, paper.id);
                                  setNotice({ kind: 'success', text: 'Paper removed.' });
                                  refreshDetail();
                                } catch (error) {
                                  setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove.' });
                                }
                              }}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="subject-picker">
                <strong>Add a paper</strong>
                <div className="inline-form">
                  <Select value={schedule.classId} placeholder="Class"
                    onChange={(event) => setSchedule((c) => ({ ...c, classId: event.target.value }))}
                    options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
                  <Select value={schedule.subjectId} placeholder="Subject"
                    onChange={(event) => setSchedule((c) => ({ ...c, subjectId: event.target.value }))}
                    options={(options?.subjects || []).map((subject) => ({ value: subject.id, label: subject.name }))} />
                  <Field label="Date" type="date" value={schedule.examDate}
                    onChange={(event) => setSchedule((c) => ({ ...c, examDate: event.target.value }))} />
                  <Field label="Start" type="time" value={schedule.startTime}
                    onChange={(event) => setSchedule((c) => ({ ...c, startTime: event.target.value }))} />
                  <Field label="End" type="time" value={schedule.endTime}
                    onChange={(event) => setSchedule((c) => ({ ...c, endTime: event.target.value }))} />
                  <Field label="Max marks" type="number" min="1" value={schedule.maxMarks}
                    onChange={(event) => setSchedule((c) => ({ ...c, maxMarks: Number(event.target.value) }))} />
                  <button type="button" className="btn-primary"
                    disabled={!schedule.classId || !schedule.subjectId}
                    onClick={async () => {
                      try {
                        await examsApi.addSchedule(exam.id, {
                          ...schedule,
                          classId: Number(schedule.classId),
                          subjectId: Number(schedule.subjectId),
                        });
                        setNotice({ kind: 'success', text: 'Paper scheduled.' });
                        refreshDetail();
                      } catch (error) {
                        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not add the paper.' });
                      }
                    }}>
                    Add paper
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
