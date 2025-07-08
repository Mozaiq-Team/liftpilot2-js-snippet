import { sendEvent } from "./trackerCore.js";

// Common selectors
const SELECTORS = {
  NAME: 'input[name="name"]',
  FIRST_NAME: ['input[name="firstName"]', 'input[name="first_name"]'],
  LAST_NAME: ['input[name="lastName"]', 'input[name="last_name"]'],
  FULL_NAME: ['input[name="fullName"]', 'input[name="full_name"]'],
  COMPANY: ['input[name="company"]', 'input[name="company_name"]'],
  EMAIL: 'input[type="email"]',
};

// Helper to safely get trimmed input value by selector(s)
function getTrimmedValue(form, selector) {
  if (Array.isArray(selector)) {
    for (const sel of selector) {
      const value = getTrimmedValue(form, sel);
      if (value) return value;
    }
    return "";
  }

  const input = form.querySelector(selector);
  return input?.value?.trim() ?? "";
}

// Determine the "name" value from the form
function extractNameValue(form) {
  // 1) Try a single "name" field first
  const nameValue = getTrimmedValue(form, SELECTORS.NAME);
  if (nameValue) return nameValue;

  // 2) Next, try firstName + lastName
  const firstName = getTrimmedValue(form, SELECTORS.FIRST_NAME);
  const lastName = getTrimmedValue(form, SELECTORS.LAST_NAME);

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  // 3) If neither first/last pair, try fullName
  return getTrimmedValue(form, SELECTORS.FULL_NAME);
}

// Validate form data before sending
function validateFormData(data) {
  return {
    formId: data.formId || "unknown",
    fields: {
      name: data.fields.name || "",
      email: data.fields.email || "",
      company: data.fields.company || "",
    },
  };
}

let _formTrackingInitialized = false;
function setupFormTracking() {
  if (_formTrackingInitialized) return;
  _formTrackingInitialized = true;

  // Use a debounced handler to prevent multiple rapid submissions
  let submitTimeout;

  // Listen in the capture phase so we catch every form before any other handler
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Clear any existing timeout
      if (submitTimeout) {
        clearTimeout(submitTimeout);
      }

      // Debounce the tracking to prevent multiple rapid submissions
      submitTimeout = setTimeout(() => {
        try {
          // Grab the email field
          const emailValue = getTrimmedValue(form, SELECTORS.EMAIL);

          // Grab the name field
          const nameValue = extractNameValue(form);

          // Grab the company name
          const companyName = getTrimmedValue(form, SELECTORS.COMPANY);

          // Only send if at least one of name or email is present
          if (nameValue || emailValue || companyName) {
            const formData = validateFormData({
              formId: form.id,
              fields: {
                name: nameValue,
                email: emailValue,
                company: companyName,
              },
            });

            sendEvent("form_submit", formData).catch((err) => {
              console.error("Form-submit tracking failed:", err);
            });
          }
        } catch (error) {
          console.error("Error processing form submission:", error);
        }
      }, 100); // 100ms debounce
    },
    { capture: true }
  );
}

export { setupFormTracking };
