import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting, formatDate } from '../../utils/greeting.js';

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

  return (
    <div className="dash">
      <WelcomeBanner
        greeting={`${greeting()},`}
        name={profile.name}
        subtitle={`${profile.className} ${profile.section} · Admission ${profile.admissionId}`}
        meta={data.today?.label}
        cta={{ label: 'My timetable', to: '/student/timetable' }}
      />

      <div className="stat-grid stat-grid--three">
        {data.cards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <div className="dash__grid">
        <SectionCard title="Today's timetable">
          <DataTable
            columns={[
              { key: 'start_time', label: 'Time', render: (row) => `${row.start_time}–${row.end_time}` },
              { key: 'subject_name', label: 'Subject' },
              { key: 'teacher_name', label: 'Teacher', render: (row) => row.teacher_name || '—' },
            ]}
            rows={data.timetable}
            rowKey="period_no"
            empty="No periods scheduled for today."
          />
        </SectionCard>

        <SectionCard title="My profile">
          <dl className="profile-facts">
            <div>
              <dt>Admission ID</dt>
              <dd>{profile.admissionId}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>
                {profile.className} {profile.section}
              </dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDate(profile.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Blood group</dt>
              <dd>{profile.bloodGroup || '—'}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <div className="dash__grid">
        <SectionCard title="Recent results" subtitle="Only published examinations" action={{ label: 'All results', to: '/student/results' }}>
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
            empty="Results appear here once the admin publishes them."
          />
        </SectionCard>

        <SectionCard title="Assignments" action={{ label: 'All', to: '/student/assignments' }}>
          {data.assignments.length === 0 ? (
            <EmptyState icon="bi-journal-plus" title="No assignments yet" />
          ) : (
            <ul className="event-list">
              {data.assignments.map((item) => (
                <li key={item.id}>
                  <span className="event-list__date">{item.due_label}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subject_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Upcoming examinations">
        {data.upcomingExams.length === 0 ? (
          <EmptyState icon="bi-journal-text" title="No exams scheduled" />
        ) : (
          <ul className="event-list event-list--inline">
            {data.upcomingExams.map((exam, index) => (
              <li key={`${exam.exam_name}-${index}`}>
                <span className="event-list__date">{exam.date_label}</span>
                <div>
                  <strong>{exam.exam_name}</strong>
                  <span>{exam.subject_name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
