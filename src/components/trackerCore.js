import "core-js/features/promise";
import "core-js/features/url-search-params";
import "whatwg-fetch";
import "regenerator-runtime/runtime";

import { getCookie, setCookie } from "./cookie.js";
import { generateId, generateVisitId } from "./idGenerator.js";
import { setupRouteTracking } from "./routeTracker.js";
import { setupFormTracking } from "./formTracker.js";
import { setupInputTracking } from "./inputTracker.js";
import { setupClickTracking } from "./clickTracker.js";
import {
  initFingerprint,
  getVisitorId,
  isAvailable,
} from "./fingerprintManager.js";
import {
  CID_COOKIE_NAME,
  AID_COOKIE_NAME,
  ALL_PERSONALIZATION_ATTRIBUTES,
  PERSONALIZATION_FLAG,
  ENFORCE_IP_COOKIE_NAME,
} from "../constants.js";
import {
  _applyPersonalization,
  _clearPersonalizationFlags,
} from "./personalization.js";

let BASE_URL = "";

let fingerprintEnabled = false;
let _lastEventTimestamp = Date.now();
let _heartbeatInterval = null; // Track the interval ID

/**
 * Set up a style element to hide elements until personalization is applied.
 */
const style = document.createElement("style");
//generate styles base on attributes array
const styles = ALL_PERSONALIZATION_ATTRIBUTES.map(
  (attr) => `[${attr}]:not([${PERSONALIZATION_FLAG}="true"]) {
          opacity: 0 !important; /* Hide elements until personalization is applied */
        }`,
).join("\n");
style.textContent = styles;
// Append the style to the head
document.head.appendChild(style);

/**
 * Start a passive heartbeat that sends visit duration updates.
 * Ensures only one heartbeat runs at a time.
 */
function startPassiveHeartbeat(intervalMs = 15000) {
  // Clear any existing heartbeat to prevent multiple intervals
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval);
    _heartbeatInterval = null;
  }

  _heartbeatInterval = setInterval(async () => {
    const now = Date.now();
    // Only send if no event sent in the last `intervalMs`
    if (now - _lastEventTimestamp > intervalMs - 100) {
      console.log(
        "Last event sent at",
        new Date(_lastEventTimestamp).toISOString(),
      );
      try {
        await sendEvent("visit_duration_update");
        // Note: _lastEventTimestamp will be updated in sendEvent
      } catch (err) {
        console.warn("Passive heartbeat failed:", err);
      }
    }
  }, intervalMs);
}

/**
 * Stop the passive heartbeat (useful for cleanup)
 */
function stopPassiveHeartbeat() {
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval);
    _heartbeatInterval = null;
  }
}

/**
 * Initialize with a base URL and ensure LP_COOKIE exists.
 * @param {{url: string, fingerprintFallback?: boolean, debug?: boolean}} options
 */
async function init(options) {
  if (!options || typeof options.url !== "string") {
    throw new Error(
      "Liftpilot Event Tracking init requires an options object with a url property",
    );
  }

  // Stop any existing heartbeat before reinitializing
  stopPassiveHeartbeat();

  BASE_URL = options.url.replace(/\/$/, ""); // remove trailing slash
  fingerprintEnabled = options.fingerprintFallback !== false; // default to true

  // Initialize fingerprinting if enabled
  if (fingerprintEnabled) {
    try {
      await initFingerprint({ debug: options.debug || false });
    } catch (error) {
      console.warn(
        "Fingerprinting initialization failed, falling back to cookie-only tracking:",
        error,
      );
      fingerprintEnabled = false;
    }
  }

  // If LP_COOKIE doesn't exist yet, generate and set it.
  let cookieVal = getCookie(CID_COOKIE_NAME);
  if (!cookieVal) {
    cookieVal = generateId();
    setCookie(CID_COOKIE_NAME, cookieVal);
  }

  // Setup tracking after cookie is fully initialized
  await new Promise((resolve) => {
    // Ensure cookie operation is complete and cached
    const finalCookieVal = getCookie(CID_COOKIE_NAME);
    resolve();
  }).then(() => {
    setupRouteTracking();
    setupClickTracking();
    setupFormTracking();
    setupInputTracking();
  });

  // Reset timestamp when initializing to prevent immediate heartbeat
  _lastEventTimestamp = Date.now();

  startPassiveHeartbeat();
}

/**
 * Get user identification using hybrid approach (cookie + fingerprint fallback)
 * @returns {Promise<string>} User ID
 */
async function getUserId() {
  // Try cookie first - now cached by getCookie function
  let cookieVal = getCookie(CID_COOKIE_NAME);
  if (cookieVal) {
    return cookieVal;
  }

  // If no cookie and fingerprinting is enabled, use fingerprint
  if (fingerprintEnabled && isAvailable()) {
    try {
      const fingerprintId = getVisitorId();
      if (fingerprintId) {
        return `fp_${fingerprintId}`;
      }
    } catch (error) {
      console.warn("Failed to get fingerprint ID:", error);
    }
  }

  if (!cookieVal) {
    cookieVal = generateId();
    setCookie(CID_COOKIE_NAME, cookieVal);
  }

  return cookieVal;
}

/**
 * Send an event payload to POST <baseUrl>/events, including LP_COOKIE in header.
 * @param {string} name
 * @param {string} type
 * @param {any} data
 * @returns {Promise<any>}
 */
async function sendEvent(name, data) {
  if (!BASE_URL) {
    throw new Error(
      "Liftpilot Event Tracking is not initialized. Call init() first.",
    );
  }
  if (!name || typeof name !== "string") {
    return Promise.reject(new Error("Event name must be a non-empty string"));
  }

  const visitId = generateVisitId();
  const userId = await getUserId();
  const aid = getCookie(AID_COOKIE_NAME);
  const enforcedIp = getCookie(ENFORCE_IP_COOKIE_NAME);

  // If data is scalar (not an object), wrap it in a value property
  let eventData;
  if (
    data === null ||
    data === undefined ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    eventData = { value: data, visitId };
  } else {
    eventData = { ...data, visitId };
  }

  const payload = { name, value: eventData };

  const headers = {
    "Content-Type": "application/json",
    "x-cid": userId,
  };

  if (aid) {
    headers["x-aid"] = aid;
  }

  if (enforcedIp) {
    headers["x-ip"] = enforcedIp;
  }

  try {
    const res = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const responseJson = await res.json();
    const { ok, cid: responseCid, aid: responseAid } = responseJson || {};
    if (ok === false) {
      throw new Error(`Failed to send event: ${res.statusText}`);
    }

    if (responseCid && responseCid !== userId) {
      // If the response cid is different, update the cookie
      setCookie(CID_COOKIE_NAME, responseCid);
    }
    if (responseAid && responseAid !== aid) {
      // If the response aid is different, update the cookie
      setCookie(AID_COOKIE_NAME, responseAid);
    }

    _lastEventTimestamp = Date.now();
  } catch (error) {
    console.error("Error sending event:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Query events via GET <baseUrl>/events?… , including LP_COOKIE in header.
 * @param {Object} queryParams  (e.g. { name: "foo", limit: 11, offset: 0 })
 * @param {Object} filter  (e.g. { uri: "/pricing", source: "google" })
 * @returns {Promise<any>}
 */
async function getEvents({ name, limit = 11, offset = 0 }, filter = {}) {
  if (!BASE_URL) {
    throw new Error(
      "Liftpilot Event Tracking is not initialized. Call init() first.",
    );
  }

  if (!name) {
    throw new Error("Event name is required");
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error(
      "No contact ID found. User tracking may not be initialized.",
    );
  }

  const aid = getCookie(AID_COOKIE_NAME);

  // Build query parameters
  const params = new URLSearchParams({
    name,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // Only add filter if it has properties
  if (Object.keys(filter).length > 1) {
    params.append("filter", JSON.stringify(filter));
  }

  const url = `${BASE_URL}/events?${params}`;

  const headers = {
    "Content-Type": "application/json",
    "x-cid": userId,
  };

  if (aid) {
    headers["x-aid"] = aid;
  }

  const enforcedIp = getCookie(ENFORCE_IP_COOKIE_NAME);
  if (enforcedIp) {
    headers["x-ip"] = enforcedIp;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to query events: ${response.status} ${response.statusText}${
          errorData.message ? ` - ${errorData.message}` : ""
        }`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error querying events:", error);
    throw error;
  }
}

/**
 * Query events via GET <baseUrl>/events?… , including LP_COOKIE in header.
 * @param {Object} queryParams  (e.g. { name: "foo", type: "bar" })
 * @param {function<any>} callback
 * @returns {Promise<any>}
 */
async function getEvent({ name }, callback) {
  if (!BASE_URL) {
    throw new Error(
      "Liftpilot Event Tracking is not initialized. Call init() first.",
    );
  }

  try {
    const userId = await getUserId();
    const aid = getCookie(AID_COOKIE_NAME);
    const url = `${BASE_URL}/event/${name}`;

    const headers = {
      "Content-Type": "application/json",
      "x-cid": userId,
    };

    if (aid) {
      headers["x-aid"] = aid;
    }

    const enforcedIp = getCookie(ENFORCE_IP_COOKIE_NAME);
    if (enforcedIp) {
      headers["x-ip"] = enforcedIp;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.statusText}`);
    }

    const responseJson = await response.json();

    // If event has only 'value' and 'visitId' properties, return just the value
    let processedResponse = responseJson;
    if (
      responseJson &&
      responseJson.value &&
      typeof responseJson.value === "object"
    ) {
      const keys = Object.keys(responseJson.value);
      if (
        keys.length === 2 &&
        keys.includes("value") &&
        keys.includes("visitId")
      ) {
        processedResponse = responseJson.value.value;
      }
    }

    // Execute callback with processed data
    if (callback) {
      callback(processedResponse);
    }

    return processedResponse;
  } catch (error) {
    console.error("Error in getEvent:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Fetch personalization data for a cid/aid
 * @param {function<any>} callback
 * @returns {<{
 *   cid: string,
 *   aid?: string,
 *   isAnonimous: boolean,
 *   personalization: Object,
 * }>}
 */
async function personalize(callback) {
  if (!BASE_URL) {
    throw new Error(
      "Liftpilot Event Tracking is not initialized. Call init() first.",
    );
  }

  try {
    const userId = await getUserId();
    const aid = getCookie(AID_COOKIE_NAME);
    const url = `${BASE_URL}/personalization`;

    const headers = {
      "Content-Type": "application/json",
      "x-cid": userId,
    };

    if (aid) {
      headers["x-aid"] = aid;
    }

    const enforcedIp = getCookie(ENFORCE_IP_COOKIE_NAME);
    if (enforcedIp) {
      headers["x-ip"] = enforcedIp;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.statusText}`);
    }

    const responseJson = await response.json();

    const { data } = responseJson;
    const { aid: responseAid, cid: responseCid, personalization } = data || {};
    if (responseAid) {
      // If aid is present, set it as a cookie
      setCookie(AID_COOKIE_NAME, responseAid);
    }
    if (responseCid) {
      // If cid is present, set it as a cookie
      setCookie(CID_COOKIE_NAME, responseCid);
    }

    // Execute callback with resolved data
    if (callback) {
      callback(responseJson);
      return;
    }

    // If no callback, replace the dom elements with personalization data
    if (personalization) {
      if (document.readyState === "loading") {
        // If document is still loading, wait for DOMContentLoaded
        document.addEventListener("DOMContentLoaded", () => {
          _applyPersonalization(personalization);
        });
      } else {
        // If document is already loaded, apply personalization immediately
        _applyPersonalization(personalization);
      }
    }
  } catch (error) {
    console.error("Error in getPersonalizationData:", error);
    _clearPersonalizationFlags();
    throw error; // Re-throw to allow caller to handle
  }
}

export { init, sendEvent, getEvents, getEvent, personalize };
