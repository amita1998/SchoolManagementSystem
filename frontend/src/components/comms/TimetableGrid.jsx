const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Read-only timetable grid: rows are periods, columns are Monday..Saturday.
 * Teachers, students and parents all render this; only the admin page adds editing.
 */
export default function TimetableGrid({ data, onRemove }) {
  if (!data) return null;
  const { periods = [], slots = [] } = data;
  const teaching = periods.filter((period) => !period.is_break);
  const byCell = new Map();
  slots.forEach((slot) => byCell.set(`${slot.day_of_week}:${slot.period_id}`, slot));

  if (teaching.length === 0) {
    return <p className="empty-state">No periods are defined yet.</p>;
  }

  return (
    <div className="table-wrap timetable">
      <table className="data-table">
        <thead>
          <tr>
            <th>Period</th>
            {DAY_LABELS.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.id} className={period.is_break ? 'is-break' : ''}>
              <th scope="row">
                <strong>{period.label}</strong>
                <span className="muted">{period.start_time}–{period.end_time}</span>
              </th>
              {period.is_break ? (
                <td colSpan={6} className="muted">Break</td>
              ) : (
                DAY_LABELS.map((label, index) => {
                  const slot = byCell.get(`${index + 1}:${period.id}`);
                  return (
                    <td key={label} className={slot ? 'is-filled' : ''}>
                      {slot ? (
                        <>
                          <strong>{slot.subject_name}</strong>
                          {slot.teacher_name && <span className="muted">{slot.teacher_name}</span>}
                          {slot.class_name && <span className="muted">{slot.class_name} {slot.section_name}</span>}
                          {onRemove && (
                            <button className="link-button" type="button" onClick={() => onRemove(slot.id)}>
                              remove
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="muted">—</span>
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
