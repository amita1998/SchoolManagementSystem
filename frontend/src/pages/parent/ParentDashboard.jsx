import { useOutletContext } from 'react-router-dom';
import WelcomeBanner from '../../components/ui/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { greeting, formatMoney } from '../../utils/greeting.js';

/** 12px muted context line for a section-card head. */
function meta(text) {
  return <span className="muted">{text}</span>;
}

function count(total, word) {
  return `${total} ${word}${total === 1 ? '' : 's'}`;
}

export default function ParentDashboard() {
  const { data, childId, setChildId, reload } = useOutletContext();

  if (data.missingProfile) {
    return (
      <div className="dash">
        <EmptyState
          icon="bi-people"
          title="No children linked to this account"
          text="The school office links your children to this family account at admission."
        />
      </div>
    );
  }

  const child = data.child;
  const activeId = childId ?? data.children[0]?.id;

  async function switchChild(id) {
    setChildId(id);
  }

  return (
    <div className="dash">
      <WelcomeBanner
        greeting={`${greeting()},`}
        name={data.shell.user.name}
        subtitle="Your child's attendance, results and fee status in one place."
        meta={data.today?.label}
        cta={{ label: 'Fee details', to: '/parent/fees' }}
      />

      {data.children.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Select child">
          {data.children.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === activeId}
              className={item.id === activeId ? 'is-active' : ''}
              onClick={() => switchChild(item.id)}
            >
              {item.name}
              <span className="tab__count">
                {item.className} {item.section}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="stat-grid stat-grid--three">
        {data.cards.map((card) => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <div className="dash__grid">
        <SectionCard title="Child profile" subtitle={meta(`Admission ${child.admissionId}`)}>
          <dl className="profile-facts">
            <div>
              <dt>Name</dt>
              <dd>{child.name}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>
                {child.className} {child.section}
              </dd>
            </div>
            <div>
              <dt>Roll no.</dt>
              <dd>{child.rollNo ?? '—'}</dd>
            </div>
            <div>
              <dt>Fees</dt>
              <dd>
                {formatMoney(data.fees.paid)} paid of {formatMoney(data.fees.payable)}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Results"
          subtitle={meta('Published exams only')}
          action={{ label: 'All results', to: '/parent/results' }}
        >
          {data.recentResults.length === 0 ? (
            <EmptyState
              icon="bi-journal-check"
              title="No results published yet"
              text="Marks appear here once the school publishes the examination."
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
      </div>

      <div className="dash__grid">
        <SectionCard
          title="Payment history"
          subtitle={meta(`${count(data.payments.length, 'receipt')} on file`)}
          action={{ label: 'Fees', to: '/parent/fees' }}
        >
          {data.payments.length === 0 ? (
            <EmptyState
              icon="bi-receipt"
              title="No payments recorded"
              text="Receipts appear here after a payment is entered at the office."
            />
          ) : (
            <ul className="history-list">
              {data.payments.map((payment) => (
                <li key={payment.receipt_no}>
                  <span className="history-list__dot" aria-hidden="true" />
                  <div>
                    <strong>
                      {formatMoney(payment.amount)}
                      {payment.is_reversed ? ' · reversed' : ''}
                    </strong>
                    <span>
                      {payment.receipt_no} · {payment.payment_mode.replace('_', ' ')} ·{' '}
                      {payment.issued_on}
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
