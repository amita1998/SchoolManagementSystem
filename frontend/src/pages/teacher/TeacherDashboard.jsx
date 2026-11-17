import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import QuickActions from '../../components/ui/QuickActions.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting } from '../../utils/greeting.js';

export default function TeacherDashboard() {
  const { data } = useOutletContext();

  if (data.missingProfile) {
    return (
      <div className="dash">
        <EmptyState
          icon="bi-person-badge"
          title="No teacher profile linked"
          text="This login exists but no teacher record points at it. The admin office can link your profile from Teacher management."
        />
      </div>
    );
  }

  const schedule = data.todaySchedule || [];

  return (
    <div className="dash">
      <WelcomeBanner
        greeting={`${greeting()},`}
        name={data.shell.user.name}
        subtitle="Your classes, today's timetable and everything waiting on you."
        meta={data.today?.label}
        cta={
          data.quickActions.length
            ? { label: data.quickActions[0].label, to: data.quickActions[0].to }
            : undefined
        }
      />

      <div className="stat-grid stat-grid--three">
        {data.cards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <QuickActions actions={data.quickActions} />

      <div className="dash__grid">
        <SectionCard title="Today's classes" subtitle="From your weekly timetable">
          <DataTable
            columns={[
              { key: 'start_time', label: 'Time', render: (row) => `${row.start_time}–${row.end_time}` },
              { key: 'class_name', label: 'Class', render: (row) => `${row.class_name} ${row.section_name}` },
              { key: 'subject_name', label: 'Subject' },
            ]}
            rows={schedule}
            rowKey="period_no"
            empty="No periods scheduled for today."
          />
        </SectionCard>

        <SectionCard title="My classes" action={{ label: 'Open', to: '/teacher/classes' }}>
          {data.classes.length === 0 ? (
            <EmptyState icon="bi-grid-3x3-gap" title="No classes assigned" text="Ask the admin to assign subjects." />
          ) : (
            <ul className="class-list">
              {data.classes.map((row) => (
                <li key={row.class_id}>
                  <span className="class-list__badge">{row.class_name.replace('Class ', '')}</span>
                  <div>
                    <strong>{row.class_name}</strong>
                    <span>
                      {row.students} students
                      {row.class_teacher_of ? ` · class teacher ${row.class_teacher_of}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="dash__grid">
        <SectionCard title="Upcoming examinations">
          {data.upcomingExams.length === 0 ? (
            <EmptyState icon="bi-journal-text" title="No exams scheduled" />
          ) : (
            <ul className="event-list">
              {data.upcomingExams.map((exam, index) => (
                <li key={`${exam.exam_name}-${index}`}>
                  <span className="event-list__date">{exam.date_label}</span>
                  <div>
                    <strong>{exam.exam_name}</strong>
                    <span>
                      {exam.subject_name} · {exam.class_name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming events">
          {data.upcomingEvents.length === 0 ? (
            <EmptyState icon="bi-calendar-event" title="No upcoming events" />
          ) : (
            <ul className="event-list">
              {data.upcomingEvents.map((event) => (
                <li key={event.id}>
                  <span className="event-list__date">{event.date_label}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{[event.category, event.location].filter(Boolean).join(' · ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
