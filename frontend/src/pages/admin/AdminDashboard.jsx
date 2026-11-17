import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import QuickActions from '../../components/ui/QuickActions.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting } from '../../utils/greeting.js';

export default function AdminDashboard() {
  const { data } = useOutletContext();
  const trend = data.attendanceTrend || [];

  return (
    <div className="dash">
      <WelcomeBanner
        greeting={`${greeting()},`}
        name={data.shell.user.name}
        subtitle="Here is the school at a glance — admissions, attendance and today's activity."
        meta={data.today?.label}
        cta={{ label: 'Add a student', to: '/admin/students/new' }}
      />

      <div className="stat-grid">
        {data.cards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <QuickActions actions={data.quickActions} />

      <div className="dash__grid">
        <SectionCard
          title="Classes overview"
          subtitle="Sections, class teachers and strength"
          action={{ label: 'All classes', to: '/admin/classes' }}
        >
          <DataTable
            columns={[
              { key: 'class_name', label: 'Class' },
              { key: 'section_name', label: 'Sec' },
              {
                key: 'class_teacher',
                label: 'Class teacher',
                render: (row) => row.class_teacher || <span className="muted">Not assigned</span>,
              },
              { key: 'students', label: 'Students', align: 'right' },
            ]}
            rows={data.classes}
            rowKey="section_id"
            empty="No classes configured yet."
          />
        </SectionCard>

        <SectionCard title="Attendance overview" subtitle="Last 7 days, school-wide">
          {trend.length === 0 ? (
            <EmptyState
              icon="bi-calendar2-x"
              title="No attendance recorded"
              text="Class teachers mark attendance; the trend appears here."
            />
          ) : (
            <div className="bars">
              {trend.map((day) => (
                <div key={day.day} className="bars__item">
                  <span className="bars__value">{day.percentage}%</span>
                  <div className="bars__track">
                    <span
                      className="bars__fill"
                      style={{ height: `${Math.max(6, Number(day.percentage))}%` }}
                    />
                  </div>
                  <span className="bars__label">{day.day}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="dash__grid">
        <SectionCard title="Upcoming events" action={{ label: 'Calendar', to: '/admin/events' }}>
          {data.upcomingEvents.length === 0 ? (
            <EmptyState
              icon="bi-calendar-event"
              title="No upcoming events"
              text="Create an event to see it here."
            />
          ) : (
            <ul className="event-list">
              {data.upcomingEvents.map((event) => (
                <li key={event.id}>
                  <span className="event-list__date">{event.date_label}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {[event.category, event.start_time, event.location].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="From the audit trail">
          {data.activities.length === 0 ? (
            <EmptyState icon="bi-clock-history" title="Nothing logged yet" />
          ) : (
            <ul className="activity-list">
              {data.activities.map((activity, index) => (
                <li key={`${activity.created_at}-${index}`}>
                  <span className="activity-list__dot" />
                  <div>
                    <strong>{activity.action.replace(/[._]/g, ' ')}</strong>
                    <span>
                      {activity.actor} ·{' '}
                      {new Date(activity.created_at).toLocaleString('en-GB', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
