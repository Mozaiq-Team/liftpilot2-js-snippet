import { sendEvent } from "./trackerCore.js";

// Helper to safely get trimmed input value by selector
function getTrimmedValue(form, selector) {
  const input = form.querySelector(selector);
  return input ? input.value.trim() : "";
}

// Determine the “name” value from the form
function extractNameValue(form) {
  // 1) Try a single “name” field first
  let nameValue = getTrimmedValue(form, 'input[name="name"]');
  if (nameValue) return nameValue;

  // 2) Next, try firstName + lastName
  const firstName = getTrimmedValue(form, 'input[name="firstName"]');
  const lastName = getTrimmedValue(form, 'input[name="lastName"]');
  if (firstName || lastName) {
    // Join with a space even if one is empty
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  // 3) If neither first/last pair, try fullName
  nameValue = getTrimmedValue(form, 'input[name="fullName"]');
  return nameValue;
}

let _formTrackingInitialized = false;
function setupFormTracking() {
  if (_formTrackingInitialized) return;
  _formTrackingInitialized = true;

  // Listen in the capture phase so we catch every form before any other handler
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Grab the email field
      const emailInput = form.querySelector('input[type="email"]');
      const emailValue = emailInput ? emailInput.value.trim() : "";

      // Grab the name field
      let nameValue = extractNameValue(form);

      // Only send if at least one of name or email is present
      if (nameValue || emailValue) {
        sendEvent("form_submit", "form", {
          name: nameValue,
          email: emailValue,
        }).catch((err) => {
          console.error("Form‐submit tracking failed:", err);
        });
      } else {
        console.warn("Form submit tracking skipped: no name or email found");
      }
      // Let the form continue submitting normally.
    },
    { capture: true },
  );
}

export { setupFormTracking };
