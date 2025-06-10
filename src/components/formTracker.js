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
  let firstName = getTrimmedValue(form, 'input[name="firstName"]');
  let lastName = getTrimmedValue(form, 'input[name="lastName"]');

  if (firstName === "") {
    firstName = getTrimmedValue(form, 'input[name="first_name"]');
  }
  if (lastName === "") {
    firstName = getTrimmedValue(form, 'input[name="last_name"]');
  }

  if (firstName || lastName) {
    // Join with a space even if one is empty
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  // 3) If neither first/last pair, try fullName
  nameValue = getTrimmedValue(form, 'input[name="fullName"]');
  if (nameValue === "") {
    nameValue = getTrimmedValue(form, 'input[name="full_name"]');
  }
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
      console.log("form submitted");
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Grab the email field
      const emailInput = form.querySelector('input[type="email"]');
      const emailValue = emailInput ? emailInput.value.trim() : "";

      // Grab the name field
      let nameValue = extractNameValue(form);

      // Grab the company name
      let companyName = getTrimmedValue(form, 'input[name="company"]');
      if (companyName === "") {
        companyName = getTrimmedValue(form, 'input[name="company_name"]');
      }

      // Only send if at least one of name or email is present
      if (nameValue || emailValue || companyName) {
        console.log("Form submission captured");
        sendEvent("form_submit", {
          formId: form.id || "unknown",
          fields: {
            name: nameValue,
            email: emailValue,
            company: companyName,
          },
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
