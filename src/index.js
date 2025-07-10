import "core-js/features/promise";
import "core-js/features/url-search-params";
import "whatwg-fetch";
import "regenerator-runtime/runtime";
import {
  init,
  sendEvent,
  getEvents,
  getEvent,
  personalize,
} from "./components/trackerCore.js";

// Expose these three methods on window.LPTracker
const LPTracker = {
  init,
  sendEvent,
  getEvents,
  getEvent,
  personalize,
};
window.LPTracker = LPTracker;
export default LPTracker;
