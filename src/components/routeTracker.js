import { sendEvent } from "./trackerCore.js"; // assume trackerCore exports sendEvent

let _initialized = false;
function _trackSpaRouteChange() {
  const fullPath =
    window.location.pathname + window.location.search + window.location.hash;
  console.log("SPA route change detected:", fullPath);
  sendEvent("spa_route_change", "navigation", { path: fullPath }).catch(
    (err) => {
      console.error("Route-change tracking failed:", err);
    },
  );
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
      "SPA route tracking requires history.pushState, history.replaceState, and window.addEventListener support.",
    );
    return;
  }

  const _origPush = history.pushState;
  history.pushState = function (...args) {
    _origPush.apply(this, args);
    _trackSpaRouteChange();
  };
  const _origReplace = history.replaceState;
  history.replaceState = function (...args) {
    _origReplace.apply(this, args);
    _trackSpaRouteChange();
  };

  window.addEventListener("popstate", _trackSpaRouteChange);

  //  Either fire immediately if DOMContentLoaded has already fired,
  //    or attach a listener to catch the initial load.
  if (document.readyState === "loading") {
    // Still loading: wait for DOMContentLoaded
    window.addEventListener("DOMContentLoaded", () => {
      console.log("DOM fully loaded and parsed");
      _trackSpaRouteChange(); // Track initial load
    });
  } else {
    // Already past loading → call immediately
    console.log("Document already loaded, tracking initial route now");
    _trackSpaRouteChange();
  }
}
