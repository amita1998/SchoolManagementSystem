import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting, formatDate } from '../../utils/greeting.js';

/** 12px muted context line for a section-card head. */
function meta(text) {
  return <span className="muted">{text}</span>;
}

function count(total, word) {
  return `${total} ${word}${total === 1 ? '' : 's'}`;
}

export default function StudentDashboard() {
  const { data } = useOutletContext();

  if (data.missingProfile) {
    return (
      <div className="dash">
        <EmptyState
          icon="bi-person-x"
          title="No student record linked"
          text="This login is not linked to a student record yet. Please contact the school office."
        />
      </div>
    );
  }

  const profile = data.profile;
  const timetable = data.timetable || [];

  return (
    <div className="dash">
      <WelcomeBanner
        greeting={`${greeting()},`}
        name={profile.name}
        subtitle={`${profile.className} ${profile.section} · Admission ${profile.admissionId}`}
        meta={data.today?.label}
        facts={
          timetable.length
            ? [{ value: timetable.length, label: `${timetable.length === 1 ? 'period' : 'periods'} today` }]
            : []
        }
        cta={{ label: 'My timetable', to: '/student/timetable' }}
      />

      <div className="stat-grid stat-grid--three">
        {data.cards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <div className="dash__grid dash__grid--wide">
        <SectionCard
          title="Today's timetable"
          subtitle={meta(timetable.length ? count(timetable.length, 'period') : 'Nothing scheduled')}
        >
          {timetable.length === 0 ? (
            <EmptyState
              icon="bi-calendar2-week"
              title="No periods scheduled for today"
              text="Your weekly timetable has no class on this weekday."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'start_time',
                  label: 'Time',
                  render: (row) => `${row.start_time}–${row.end_time}`,
                },
                { key: 'subject_name', label: 'Subject' },
                { key: 'teacher_name', label: 'Teacher', render: (row) => row.teacher_name || '—' },
              ]}
              rows={timetable}
              rowKey="period_no"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming examinations"
          subtitle={meta('Exam schedule for your class')}
        >
          {data.upcomingExams.length === 0 ? (
            <EmptyState
              icon="bi-journal-text"
              title="No exams scheduled"
              text="Examination dates appear here once the office publishes the schedule."
            />
          ) : (
            <ul className="history-list">
              {data.upcomingExams.map((exam, index) => (
                <li key={`${exam.exam_name}-${index}`}>
                  <span className="history-list__dot" aria-hidden="true" />
                  <div>
                    <strong>{exam.exam_name}</strong>
                    <span>{[exam.subject_name, exam.date_label].filter(Boolean).join(' · ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="dash__grid dash__grid--wide">
        <SectionCard
          title="Recent results"
          subtitle={meta('Published exams only')}
          action={{ label: 'All results', to: '/student/results' }}
        >
          {data.recentResults.length === 0 ? (
            <EmptyState
              icon="bi-journal-check"
              title="No results published yet"
              text="Marks appear here once the admin office publishes the examination."
            />
          ) : (
            <DataTable
              columns={[
                { key: 'exam_name', label: 'Exam' },
                { key: 'subject_name', label: 'Subject' },
                {
                  key: 'marks',
                  label: 'Marks',
                  align: 'right',
                  render: (row) => `${Number(row.marks_obtained)} / ${Number(row.max_marks)}`,
                },
                { key: 'grade', label: 'Grade', align: 'right', render: (row) => row.grade || '—' },
              ]}
              rows={data.recentResults}
              rowKey="subject_name"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Assignments"
          subtitle={meta('Set for your class')}
          action={{ label: 'All assignments', to: '/student/assignments' }}
        >
          {data.assignments.length === 0 ? (
            <EmptyState
              icon="bi-journal-plus"
              title="No assignments yet"
              text="Homework set by your teachers will appear here."
            />
          ) : (
            <ul className="history-list">
              {data.assignments.map((item) => (
                <li key={item.id}>
                  <span className="history-list__dot" aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {[item.subject_name, `due ${item.due_label}`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="My profile">
        <div className="review-grid">
          <div>
            <span>Admission ID</span>
            <strong>{profile.admissionId}</strong>
          </div>
          <div>
            <span>Class</span>
            <strong>
              {profile.className} {profile.section}
            </strong>
          </div>
          <div>
            <span>Date of birth</span>
            <strong>{formatDate(profile.dateOfBirth)}</strong>
          </div>
          <div>
            <span>Blood group</span>
            <strong>{profile.bloodGroup || '—'}</strong>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
