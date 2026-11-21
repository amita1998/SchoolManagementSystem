/**
 * The school's own calendar day, as `YYYY-MM-DD`.
 *
 * `new Date().toISOString().slice(0, 10)` is *yesterday* until 05:30 IST, so a date input
 * pre-filled that way shows the wrong day for the first five and a half hours of every
 * school day. Format in the school timezone instead.
 */
const SCHOOL_TIMEZONE = 'Asia/Kolkata';

export function todayISO(timeZone = SCHOOL_TIMEZONE) {
  // en-CA formats as YYYY-MM-DD, which is exactly the value a <input type="date"> wants.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export default todayISO;
