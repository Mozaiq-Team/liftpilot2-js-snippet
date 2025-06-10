import { sendEvent } from "./trackerCore.js";

let _initialized = false;
function _trackRouteChange() {
  const fullPath =
    window.location.pathname + window.location.search + window.location.hash;
  console.log("page visit detected:", fullPath);
  sendEvent("page_visit", { uri: fullPath }).catch((err) => {
    console.error("Page visit tracking failed:", err);
  });
}

export function setupRouteTracking() {
  if (_initialized) return;
  _initialized = true;
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

  window.addEventListener("popstate", _trackRouteChange);

  //  Either fire immediately if DOMContentLoaded has already fired,
  //    or attach a listener to catch the initial load.
  if (document.readyState === "loading") {
    // Still loading: wait for DOMContentLoaded
    window.addEventListener("DOMContentLoaded", () => {
      console.log("DOM fully loaded and parsed");
      _trackRouteChange(); // Track initial load
    });
  } else {
    // Already past loading → call immediately
    console.log("Document already loaded, tracking initial route now");
    _trackRouteChange();
  }
}
