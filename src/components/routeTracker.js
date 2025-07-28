import { generateVisitId } from "./idGenerator.js";
import { sendEvent } from "./trackerCore.js";
import { UAParser } from "ua-parser-js";

let _initialized = false;
let _cleanup = null;

const parser = new UAParser();

function _trackRouteChange() {
  try {
    const device = parser.getResult();
    if (device.device.type === undefined) {
      device.device.type = "desktop"; // Default to desktop if type is not defined
    }

    const deviceType = {
      browser: device.browser || "unknown",
      device: device.device || { type: "unknown" },
      os: device.os || { name: "unknown" },
    };

    const fullPath =
      window.location.pathname + window.location.search + window.location.hash;
    const trackingData = {
      uri: fullPath,
      timestamp: new Date().toISOString(),
      previousURL: document.referrer,
      title: document.title,
      deviceType,
    };

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
        "Page visit tracking requires history.pushState, history.replaceState, and window.addEventListener support.",
      );
      return;
    }

    generateVisitId();

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
        _trackRouteChange();
      });
    } else {
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
