const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Read-only timetable grid: rows are periods, columns are Monday..Saturday.
 * Teachers, students and parents all render this; only the admin page adds editing
 * (the remove button), so `onRemove` decides whether any control appears.
 */
export default function TimetableGrid({ data, onRemove }) {
  if (!data) return null;
  const { periods = [], slots = [] } = data;
  const teaching = periods.filter((period) => !period.is_break);
  const byCell = new Map();
  slots.forEach((slot) => byCell.set(`${slot.day_of_week}:${slot.period_id}`, slot));

  if (teaching.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__icon"><i className="bi bi-clock-history" aria-hidden="true" /></span>
        <strong>No periods are defined yet</strong>
        <span>Once the school sets its period timings, the week appears here.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap tt-wrap">
      <table className="tt-grid">
        <thead>
          <tr>
            <th scope="col">Period</th>
            {DAY_LABELS.map((label) => (
              <th key={label} scope="col">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.id} className={period.is_break ? 'is-break' : ''}>
              <th scope="row" className="tt-grid__period">
                <strong>{period.label}</strong>
                <span>{period.start_time}–{period.end_time}</span>
              </th>
              {period.is_break ? (
                <td colSpan={6} className="tt-cell tt-cell--break">Break</td>
              ) : (
                DAY_LABELS.map((label, index) => {
                  const slot = byCell.get(`${index + 1}:${period.id}`);
                  return (
                    <td key={label} className={`tt-cell ${slot ? 'tt-cell--filled' : ''}`}>
                      {slot ? (
                        <>
                          <span className="tt-cell__subject">{slot.subject_name}</span>
                          {slot.teacher_name && <span className="tt-cell__meta">{slot.teacher_name}</span>}
                          {(slot.class_name || slot.room) && (
                            <span className="tt-cell__meta">
                              {[slot.class_name ? `${slot.class_name} ${slot.section_name || ''}`.trim() : null, slot.room || null]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          {onRemove && (
                            <button
                              className="tt-cell__remove"
                              type="button"
                              onClick={() => onRemove(slot.id)}
                              aria-label={`Remove ${slot.subject_name} from ${label}, ${period.label}`}
                              title="Remove period"
                            >
                              <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="tt-cell__free">—</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
