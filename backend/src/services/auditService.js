import { query } from '../config/db.js';

/**
 * Append-only audit trail. Never throws into the caller's path: a failed audit
 * insert must not turn a successful business action into an error, but it must
 * be visible in logs.
 */
export async function audit(entry) {
  const {
    actorUserId = null,
    actorRole = null,
    action,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    reason = null,
    ip = null,
    userAgent = null,
  } = entry;

  try {
    await query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id,
         old_values, new_values, reason, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        actorUserId,
        actorRole,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        reason,
        ip,
        userAgent ? String(userAgent).slice(0, 400) : null,
      ],
    );
  } catch (error) {
    console.error('[audit] failed to write audit entry', { action, entityType, entityId, error });
  }
}

export default audit;
