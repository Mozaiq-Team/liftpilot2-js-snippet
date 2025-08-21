import { sendEvent } from "./trackerCore.js";

let _initialized = false;
let _cleanup = null;
let _lastClickTime = 0;
let _lastClickElement = null;

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

// Helper function to check for duplicate clicks
function isDuplicateClick(element, timestamp) {
  const timeDiff = timestamp - _lastClickTime;
  const isSameElement = element === _lastClickElement;

  // Consider it duplicate if same element clicked within 300ms
  return isSameElement && timeDiff < 300;
}

// Main click tracking function
function _trackClick(event) {
  try {
    const timestamp = Date.now();
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

    // Check for duplicates
    if (isDuplicateClick(targetElement, timestamp)) {
      return;
    }

    // Update tracking variables
    _lastClickTime = timestamp;
    _lastClickElement = targetElement;

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

    const options = { capture: true, passive: true };

    // Add click event listener to document (event delegation)
    document.addEventListener("click", _trackClick, options);

    // For iOS/Safari devices that might not fire click events reliably
    if ("ontouchstart" in window) {
      let touchStartTime = 0;
      let touchStartElement = null;

      // Track touch start
      const handleTouchStart = (event) => {
        touchStartTime = Date.now();
        touchStartElement = event.target;
      };

      // Handle touch end as potential click for iOS
      const handleTouchEnd = (event) => {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;

        // Only treat as click if touch was brief and on same element
        if (
          touchDuration < 300 &&
          event.target === touchStartElement &&
          event.changedTouches.length === 1
        ) {
          // Wait to see if a real click event fires
          setTimeout(() => {
            const timeSinceTouch = Date.now() - touchEndTime;
            // If no click processed within 50ms, treat touch as click
            if (
              timeSinceTouch >= 50 &&
              !isDuplicateClick(event.target, touchEndTime)
            ) {
              // Create a synthetic click event
              _trackClick({
                target: event.target,
                type: "touchend",
              });
            }
          }, 50);
        }
      };

      document.addEventListener("touchstart", handleTouchStart, options);
      document.addEventListener("touchend", handleTouchEnd, options);

      // Update cleanup to remove touch listeners
      _cleanup = () => {
        if (!_initialized) return;
        document.removeEventListener("click", _trackClick, options);
        document.removeEventListener("touchstart", handleTouchStart, options);
        document.removeEventListener("touchend", handleTouchEnd, options);
        _initialized = false;
        _cleanup = null;
        _lastClickTime = 0;
        _lastClickElement = null;
      };
    } else {
      // Non-touch devices cleanup
      _cleanup = () => {
        if (!_initialized) return;
        document.removeEventListener("click", _trackClick, options);
        _initialized = false;
        _cleanup = null;
        _lastClickTime = 0;
        _lastClickElement = null;
      };
    }

    _initialized = true;
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
