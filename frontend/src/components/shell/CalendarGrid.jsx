const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Month grid built with UTC arithmetic — the payload's dates are plain
 * 'YYYY-MM-DD' strings and must never pass through a local Date.
 */
export default function CalendarGrid({ calendar }) {
  if (!calendar) return null;
  const { year, month, today, events = [] } = calendar;

  const eventsByDate = events.reduce((accumulator, event) => {
    accumulator[event.date] = accumulator[event.date] || [];
    accumulator[event.date].push(event);
    return accumulator;
  }, {});

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells = [];
  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push(<span key={`blank-${index}`} className="cal__cell cal__cell--blank" />);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = eventsByDate[iso] || [];
    const classes = [
      'cal__cell',
      dayEvents.length ? 'has-event' : '',
      iso === today ? 'is-today' : '',
    ]
      .filter(Boolean)
      .join(' ');
    cells.push(
      <span
        key={iso}
        className={classes}
        title={dayEvents.map((event) => event.title).join(' · ') || undefined}
      >
        {day}
      </span>,
    );
  }

  return (
    <div className="cal">
      <div className="cal__head">
        <strong>{calendar.label}</strong>
        <span className="cal__legend">
          <i className="dot dot--coral" /> today
          <i className="dot dot--lavender" /> event
        </span>
      </div>
      <div className="cal__grid cal__grid--weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day} className="cal__weekday">
            {day}
          </span>
        ))}
      </div>
      <div className="cal__grid">{cells}</div>
    </div>
  );
}
