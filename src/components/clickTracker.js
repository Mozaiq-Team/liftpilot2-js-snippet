import { sendEvent } from "./trackerCore.js";

let _initialized = false;
let _cleanup = null;

// Helper function to check if element is clickable (anchor or button)
function isClickableElement(element) {
  if (!element || !element.tagName) return false;

  const tagName = element.tagName.toLowerCase();
  return tagName === "a" || tagName === "button";
}

// Helper function to find the first clickable parent element
function findClickableParent(element) {
  let current = element;

  // Traverse up the DOM tree until we hit body
  while (current && current !== document.body) {
    if (isClickableElement(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

// Helper function to safely get element text content
function getElementText(element) {
  if (!element) return "";

  // Get text content and clean it up
  let text = element.textContent || element.innerText || "";

  // Clean up whitespace and trim
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// Helper function to get element attributes
function getElementData(element) {
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();
  let elementType = "unknown";
  if (tagName === "button") {
    elementType = "button";
  }
  if (tagName === "a") {
    elementType = "link";
  }

  const data = {
    elementType,
    textContent: getElementText(element),
  };

  if (tagName === "a") {
    data.href = element.href || null;
  }
  if (element.id) {
    data.id = element.id || null;
  }

  return data;
}

// Main click tracking function
function _trackClick(event) {
  try {
    let targetElement = event.target;

    // First check if the clicked element itself is clickable
    if (!isClickableElement(targetElement)) {
      // If not, find the first clickable parent
      targetElement = findClickableParent(targetElement);
    }

    // If no clickable element found, don't track
    if (!targetElement) {
      return;
    }

    // Get element data
    const elementData = getElementData(targetElement);

    // Send the tracking event
    sendEvent("click_event", elementData).catch((err) => {
      console.error("Click tracking failed:", err);
    });
  } catch (error) {
    console.error("Error in click tracking:", error);
  }
}

// Setup click tracking
export function setupClickTracking() {
  if (_initialized) return;

  try {
    // Check for required browser features
    if (!document.addEventListener) {
      console.warn("Click tracking requires addEventListener support.");
      return;
    }

    // Add click event listener to document (event delegation)
    document.addEventListener("click", _trackClick, true);

    _initialized = true;

    // Setup cleanup function
    _cleanup = () => {
      if (!_initialized) return;

      document.removeEventListener("click", _trackClick, true);
      _initialized = false;
      _cleanup = null;
    };
  } catch (error) {
    console.error("Error setting up click tracking:", error);
    if (_cleanup) {
      _cleanup();
    }
  }
}

// Cleanup click tracking
export function cleanupClickTracking() {
  if (_cleanup) {
    _cleanup();
  }
}
