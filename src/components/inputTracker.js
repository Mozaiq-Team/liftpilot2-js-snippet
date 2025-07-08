import { sendEvent } from "./trackerCore.js";

// Constants
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{10,}$/;
const URL_PATTERN =
  /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

// Validation functions
const validators = {
  email: (value) => EMAIL_PATTERN.test(value),
  tel: (value) => PHONE_PATTERN.test(value),
  url: (value) => URL_PATTERN.test(value),
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

let _inputTrackingInitialized = false;
let _eventListener = null;

function setupInputTracking() {
  if (_inputTrackingInitialized) return;
  _inputTrackingInitialized = true;

  const handleInputBlur = debounce((e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;

    // Skip empty values
    if (el.value.trim() === "") {
      return;
    }

    // Validate input based on type
    const validator = validators[el.type];
    if (validator && !validator(el.value)) {
      return;
    }

    // Send the event with the input name and value
    sendEvent("input_blur", {
      formId: el.form?.id || "unknown",
      inputType: el.type,
      [el.name]: el.value,
    }).catch((err) => {
      console.error("Input blur tracking failed:", {
        error: err.message,
        inputName: el.name,
        inputType: el.type,
      });
    });
  }, 300); // 300ms debounce

  _eventListener = handleInputBlur;
  document.addEventListener("focusout", _eventListener);
}

// Cleanup function to remove event listener
function cleanupInputTracking() {
  if (_eventListener) {
    document.removeEventListener("focusout", _eventListener);
    _eventListener = null;
    _inputTrackingInitialized = false;
  }
}

export { setupInputTracking, cleanupInputTracking };
