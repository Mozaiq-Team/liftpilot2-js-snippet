import { sendEvent } from "./trackerCore.js";

let _initialized = false;
let _cleanup = null;

function _trackRouteChange() {
  try {
    const fullPath =
      window.location.pathname + window.location.search + window.location.hash;
    const trackingData = {
      uri: fullPath,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    console.log("page visit detected:", trackingData);
    sendEvent("page_visit", trackingData).catch((err) => {
      console.error("Page visit tracking failed:", err);
    });
  } catch (error) {
    console.error("Error in route tracking:", error);
  }
}

export function setupRouteTracking() {
  if (_initialized) return;

  try {
    if (
      !window.history ||
      !window.history.pushState ||
      !window.history.replaceState ||
      !window.addEventListener
    ) {
      console.warn(
        "Page visit tracking requires history.pushState, history.replaceState, and window.addEventListener support."
      );
      return;
    }

    const _origPush = history.pushState;
    history.pushState = function (...args) {
      _origPush.apply(this, args);
      _trackRouteChange();
    };

    const _origReplace = history.replaceState;
    history.replaceState = function (...args) {
      _origReplace.apply(this, args);
      _trackRouteChange();
    };

    const popstateHandler = _trackRouteChange;
    window.addEventListener("popstate", popstateHandler);

    // Track initial page load
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", () => {
        console.log("DOM fully loaded and parsed");
        _trackRouteChange();
      });
    } else {
      console.log("Document already loaded, tracking initial route now");
      _trackRouteChange();
    }

    _initialized = true;

    // Setup cleanup function
    _cleanup = () => {
      if (!_initialized) return;

      history.pushState = _origPush;
      history.replaceState = _origReplace;
      window.removeEventListener("popstate", popstateHandler);
      _initialized = false;
      _cleanup = null;
    };
  } catch (error) {
    console.error("Error setting up route tracking:", error);
    if (_cleanup) {
      _cleanup();
    }
  }
}

export function cleanupRouteTracking() {
  if (_cleanup) {
    _cleanup();
  }
}
