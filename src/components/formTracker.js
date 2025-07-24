import { sendEvent } from "./trackerCore.js";

// Helper to safely get trimmed input value
function getTrimmedValue(input) {
  if (!input) return "";

  // Handle different input types
  switch (input.type) {
    case "checkbox":
    case "radio":
      return input.checked ? input.value || "true" : "";
    case "select-one":
    case "select-multiple":
      if (input.multiple) {
        return Array.from(input.selectedOptions)
          .map((option) => option.value)
          .filter(Boolean)
          .join(", ");
      }
      return input.value?.trim() ?? "";
    case "file":
      return input.files?.length ? `${input.files.length} file(s)` : "";
    default:
      return input.value?.trim() ?? "";
  }
}

// Get all form fields and their values - no validation
function getAllFormFields(form) {
  const fields = {};

  // Query for all form input elements
  const formElements = form.querySelectorAll(
    'input, select, textarea, [contenteditable="true"]',
  );

  formElements.forEach((element) => {
    // Skip certain input types that shouldn't be tracked
    if (
      element.type === "password" ||
      element.type === "hidden" ||
      element.type === "submit" ||
      element.type === "reset" ||
      element.type === "button"
    ) {
      return;
    }

    // Get field identifier (prefer name, fallback to id, then generate one)
    const fieldName =
      element.name ||
      element.id ||
      element.getAttribute("data-field") ||
      `field_${element.tagName.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`;

    // Skip if no valid field name
    if (!fieldName) return;

    const value = getTrimmedValue(element);

    // Include ANY field that has a value - no validation
    if (value) {
      // Handle multiple fields with same name (like radio groups)
      if (fields[fieldName]) {
        // Convert to array if multiple values exist
        if (Array.isArray(fields[fieldName])) {
          fields[fieldName].push(value);
        } else {
          fields[fieldName] = [fields[fieldName], value];
        }
      } else {
        fields[fieldName] = value;
      }
    }
  });

  return fields;
}

// Simple form data structure
function structureFormData(formId, fields) {
  return {
    formId: formId || "unknown",
    fields: fields,
  };
}

// Extract all form data
function extractFormData(form) {
  const allFields = getAllFormFields(form);

  // Send if ANY field has data
  if (Object.keys(allFields).length === 0) {
    return null;
  }

  return structureFormData(
    form.id || form.name || `form_${Date.now()}`,
    allFields,
  );
}

// Track form data without blocking submission
function trackFormSubmission(form) {
  try {
    const formData = extractFormData(form);
    if (formData) {
      // Send tracking event in parallel - don't wait for completion
      sendEvent("form_submit", formData).catch((err) => {
        console.error("Form tracking failed:", err);
      });
      console.log("Form tracking initiated (non-blocking):", formData);
    }
  } catch (error) {
    console.error("Form tracking error:", error);
    // Fail silently - don't impact form submission
  }
}

let _formTrackingInitialized = false;
const trackedForms = new WeakSet();

function setupFormTracking() {
  if (_formTrackingInitialized) return;
  _formTrackingInitialized = true;

  // Method 1: Non-blocking submit event tracking
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (trackedForms.has(form)) return;

      // Don't prevent default - let form submit normally
      console.log("Form submission detected, tracking in parallel...");

      // Track in parallel without blocking
      trackFormSubmission(form);
    },
    { capture: true },
  );

  // Method 2: Button click tracking as backup
  document.addEventListener(
    "click",
    (e) => {
      const button = e.target;

      // Check if it's a submit button
      if (
        (button.type === "submit" ||
          (button.tagName === "BUTTON" && !button.type)) &&
        button.form
      ) {
        const form = button.form;

        // Track immediately when button is clicked (backup method)
        const formData = extractFormData(form);
        if (formData) {
          console.log("Submit button clicked, tracking form data:", formData);

          // Send tracking immediately without blocking
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

// Setup individual form watcher - non-blocking
function setupFormWatcher(form) {
  if (trackedForms.has(form)) return;
  trackedForms.add(form);

  // Watch for input changes to capture data in real-time
  form.addEventListener("input", () => {
    const formData = extractFormData(form);
    if (formData) {
      // Store the latest form data for backup
      form._lpFormData = formData;
    }
  });

  // Override form.submit() method for programmatic submissions
  const originalSubmit = form.submit;
  form.submit = function () {
    console.log("Form.submit() called, tracking form data...");

    // Track without blocking
    trackFormSubmission(this);

    // Immediately call original submit
    originalSubmit.call(this);
  };
}

// Non-blocking form tracking (recommended approach)
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
        console.log("Form submitted, tracking in parallel:", formData);
      }
    },
    { capture: true },
  );
}

export { setupFormTracking, setupNonBlockingFormTracking, extractFormData };
