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

// Extract form data
function extractFormData(form) {
  const emailValue = getTrimmedValue(form, SELECTORS.EMAIL);
  const nameValue = extractNameValue(form);
  const companyName = getTrimmedValue(form, SELECTORS.COMPANY);

  // Only process if at least one field has data
  if (nameValue || emailValue || companyName) {
    return validateFormData({
      formId: form.id,
      fields: {
        name: nameValue,
        email: emailValue,
        company: companyName,
      },
    });
  }
  return null;
}

// Track form data with original submit behavior
async function trackFormSubmission(form, originalSubmitHandler) {
  try {
    const formData = extractFormData(form);
    if (formData) {
      // Send tracking event and wait for completion
      await sendEvent("form_submit", formData);
      console.log("Form tracking completed successfully");
    }
  } catch (error) {
    console.error("Form tracking failed:", error);
    // Continue with form submission even if tracking fails
  } finally {
    // Always proceed with original form submission
    if (originalSubmitHandler) {
      originalSubmitHandler();
    }
  }
}

let _formTrackingInitialized = false;
const trackedForms = new WeakSet();

function setupFormTracking() {
  if (_formTrackingInitialized) return;
  _formTrackingInitialized = true;

  // Method 1: Intercept submit events and delay them
  document.addEventListener(
    "submit",
    async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (trackedForms.has(form)) return; // Avoid double processing

      // Prevent the default submission
      e.preventDefault();
      e.stopImmediatePropagation();

      console.log("Form submission intercepted, tracking data...");

      // Create a function to continue with original submission
      const continueSubmission = () => {
        trackedForms.add(form); // Mark as processed

        // Re-submit the form
        if (form.action && form.method) {
          // If form has action/method, submit normally
          form.submit();
        } else {
          // If it's handled by JavaScript, dispatch a new submit event
          const newEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          // Add a flag to identify this as our re-submission
          newEvent._lpTracked = true;
          form.dispatchEvent(newEvent);
        }
      };

      // Track the form submission
      await trackFormSubmission(form, continueSubmission);
    },
    { capture: true },
  );

  // Method 2: Also watch for button clicks as backup
  document.addEventListener(
    "click",
    async (e) => {
      const button = e.target;

      // Check if it's a submit button
      if (
        (button.type === "submit" ||
          (button.tagName === "BUTTON" && !button.type)) &&
        button.form
      ) {
        const form = button.form;

        // Extract data immediately when button is clicked
        const formData = extractFormData(form);
        if (formData) {
          console.log("Pre-submit form data captured:", formData);

          // Option: Send tracking immediately without waiting
          sendEvent("form_submit", formData).catch((err) => {
            console.error("Form tracking failed:", err);
          });
        }
      }
    },
    { capture: true },
  );

  // Method 3: Watch for forms that might be submitted via JavaScript
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Find new forms
          const forms =
            node.tagName === "FORM"
              ? [node]
              : node.querySelectorAll
                ? node.querySelectorAll("form")
                : [];

          forms.forEach((form) => {
            if (!trackedForms.has(form)) {
              setupFormWatcher(form);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Setup watchers for existing forms
  document.querySelectorAll("form").forEach(setupFormWatcher);
}

// Setup individual form watcher
function setupFormWatcher(form) {
  if (trackedForms.has(form)) return;
  trackedForms.add(form);

  // Watch for input changes to capture data in real-time
  form.addEventListener("input", () => {
    const formData = extractFormData(form);
    if (formData) {
      // Store the latest form data
      form._lpFormData = formData;
    }
  });

  // Alternative: Override form.submit() method
  const originalSubmit = form.submit;
  form.submit = function () {
    console.log("Form.submit() called, tracking data...");

    const formData = extractFormData(this);
    if (formData) {
      // Send tracking event
      sendEvent("form_submit", formData)
        .catch((err) => {
          console.error("Form tracking failed:", err);
        })
        .finally(() => {
          // Call original submit
          originalSubmit.call(this);
        });
    } else {
      // No data to track, submit normally
      originalSubmit.call(this);
    }
  };
}

// Alternative approach: Non-blocking tracking
function setupNonBlockingFormTracking() {
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Don't prevent default - let form submit normally
      const formData = extractFormData(form);
      if (formData) {
        // Send tracking in parallel with form submission
        sendEvent("form_submit", formData).catch((err) => {
          console.error("Form tracking failed:", err);
        });
      }
    },
    { capture: true },
  );
}

export { setupFormTracking, setupNonBlockingFormTracking, extractFormData };
