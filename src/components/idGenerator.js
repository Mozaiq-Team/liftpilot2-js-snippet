import { ulid } from "ulid";

/**
 * generateId:
 *  - if the browser supports crypto.randomUUID(), use it.
 *  - otherwise, fall back to ulid().
 */
function generateId() {
  // 1) In modern browsers use randomUUID()
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // 2) As a final fallback (IE11), use ulid:
  return ulid();
}

export { generateId };
