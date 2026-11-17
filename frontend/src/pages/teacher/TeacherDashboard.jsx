import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import QuickActions from '../../components/ui/QuickActions.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting } from '../../utils/greeting.js';

/** 12px muted context line for a section-card head. */
function meta(text) {
  return <span className="muted">{text}</span>;
}

function count(total, word) {
  return `${total} ${word}${total === 1 ? '' : 's'}`;
}

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
        facts={
          schedule.length
            ? [{ value: schedule.length, label: `${schedule.length === 1 ? 'period' : 'periods'} today` }]
            : []
        }
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

      <div className="dash__grid dash__grid--wide">
        <SectionCard
          title="Today's classes"
          subtitle={meta(
            schedule.length ? `${count(schedule.length, 'period')} on your timetable` : 'Nothing scheduled',
          )}
        >
          {schedule.length === 0 ? (
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
                {
                  key: 'class_name',
                  label: 'Class',
                  render: (row) => `${row.class_name} ${row.section_name}`,
                },
                { key: 'subject_name', label: 'Subject' },
              ]}
              rows={schedule}
              rowKey="period_no"
            />
          )}
        </SectionCard>

        <SectionCard
          title="My classes"
          subtitle={meta(`${count(data.classes.length, 'class')} assigned`)}
          action={{ label: 'Open', to: '/teacher/classes' }}
        >
          {data.classes.length === 0 ? (
            <EmptyState
              icon="bi-grid-3x3-gap"
              title="No classes assigned"
              text="Ask the admin office to assign subjects to your profile."
            />
          ) : (
            <ul className="people-list">
              {data.classes.map((row) => (
                <li key={row.class_id}>
                  <span className="people-list__avatar" aria-hidden="true">
                    {row.class_name.replace('Class ', '')}
                  </span>
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
        <SectionCard title="Upcoming examinations" subtitle={meta('For the classes you teach')}>
          {data.upcomingExams.length === 0 ? (
            <EmptyState
              icon="bi-journal-text"
              title="No exams scheduled"
              text="Examination dates for your classes will appear here."
            />
          ) : (
            <ul className="history-list">
              {data.upcomingExams.map((exam, index) => (
                <li key={`${exam.exam_name}-${index}`}>
                  <span className="history-list__dot" aria-hidden="true" />
                  <div>
                    <strong>{exam.exam_name}</strong>
                    <span>
                      {[exam.subject_name, exam.class_name, exam.date_label].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming events" subtitle={meta('School calendar')}>
          {data.upcomingEvents.length === 0 ? (
            <EmptyState icon="bi-calendar-event" title="No upcoming events" />
          ) : (
            <ul className="history-list">
              {data.upcomingEvents.map((event) => (
                <li key={event.id}>
                  <span className="history-list__dot" aria-hidden="true" />
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {[event.date_label, event.category, event.start_time, event.location]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
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
