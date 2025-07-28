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

function generateVisitId() {
  if (window.VISIT_ID) {
    return window.VISIT_ID; // Return existing visit ID if available
  }
  // Generate a new visit ID
  const visitId = generateId();
  window.VISIT_ID = visitId; // Store it globally
  return visitId;
}

export { generateId, generateVisitId };
