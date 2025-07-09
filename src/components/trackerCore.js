import "core-js/features/promise";
import "core-js/features/url-search-params";
import "whatwg-fetch";
import "regenerator-runtime/runtime";

import { getCookie, setCookie } from "./cookie.js";
import { generateId } from "./idGenerator.js";
import { setupRouteTracking } from "./routeTracker.js";
import { setupFormTracking } from "./formTracker.js";
import { setupInputTracking } from "./inputTracker.js";
import {
  initFingerprint,
  getVisitorId,
  isAvailable,
} from "./fingerprintManager.js";

let BASE_URL = "";
const COOKIE_NAME = "LP_COOKIE";
const AID_COOKIE_NAME = "LP_AID_COOKIE";

const PERSONALIZATION_ATTRIBUTE_COPY = "data-lp-variable-copy";
const PERSONALIZATION_ATTRIBUTE_SRC = "data-lp-variable-src";
const PERSONALIZATION_ATTRIBUTE_HREF = "data-lp-variable-href";
const ALL_PERSONALIZATION_ATTRIBUTES = [
  PERSONALIZATION_ATTRIBUTE_COPY,
  PERSONALIZATION_ATTRIBUTE_SRC,
  PERSONALIZATION_ATTRIBUTE_HREF,
];
const PERSONALIZATION_FLAG = "data-lp-variable-ready";

let fingerprintEnabled = false;

/**
 * Set up a style element to hide elements until personalization is applied.
 */
const style = document.createElement("style");
//generate styles base on attributes array
const styles = ALL_PERSONALIZATION_ATTRIBUTES.map(
  (attr) => `[${attr}]:not([${PERSONALIZATION_FLAG}="true"]) {
          opacity: 0 !important; /* Hide elements until personalization is applied */bin.usr-is-merged/
        }`,
).join(",\n");
style.textContent = styles;
// Append the style to the head
document.head.appendChild(style);
/**
 *
 */

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
  let cookieVal = getCookie(COOKIE_NAME);
  if (!cookieVal) {
    cookieVal = generateId();
    setCookie(COOKIE_NAME, cookieVal);
  }

  // Setup route tracking
  setupRouteTracking();
  // Setup form tracking
  setupFormTracking();
  // Setup input tracking
  setupInputTracking();
}

/**
 * Get user identification using hybrid approach (cookie + fingerprint fallback)
 * @returns {Promise<string>} User ID
 */
async function getUserId() {
  // Try cookie first
  const cookieVal = getCookie(COOKIE_NAME);
  if (cookieVal) {
    return cookieVal;
  }

  // If no cookie and fingerprinting is enabled, use fingerprint
  if (fingerprintEnabled && isAvailable()) {
    try {
      const fingerprintId = await getVisitorId();
      if (fingerprintId) {
        return `fp_${fingerprintId}`;
      }
    } catch (error) {
      console.warn("Failed to get fingerprint ID:", error);
    }
  }

  // Last resort: generate new ID (but it won't persist without cookies)
  return generateId();
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

  const userId = await getUserId();
  const aid = getCookie(AID_COOKIE_NAME);
  const payload = { name, value: data };

  const headers = {
    "Content-Type": "application/json",
    "x-cid": userId,
  };

  if (aid) {
    headers["x-aid"] = aid;
  }

  return fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to send event: ${response.statusText}`);
    }
    return response.json();
  });
}

/**
 * Query events via GET <baseUrl>/events?… , including LP_COOKIE in header.
 * @param {Object} queryParams  (e.g. { name: "foo", limit: 10, offset: 0 })
 * @param {Object} filter  (e.g. { uri: "/pricing", source: "google" })
 * @returns {Promise<any>}
 */
async function getEvents({ name, limit = 10, offset = 0 }, filter = {}) {
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
  if (Object.keys(filter).length > 0) {
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
 * @param {function<resultData>} callback
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

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.statusText}`);
    }

    const responseJson = await response.json();

    // Execute callback with resolved data
    if (callback) {
      callback(responseJson);
    }

    return responseJson;
  } catch (error) {
    console.error("Error in getEvent:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Apply personalization attributes to the DOM elements
 * @param {Object} attributes - The personalization attributes to apply();
 * @param {Object} personalizationObject - The personalization data object - containing key-value pairs for personalization
 * @returns {void}
 * @private
 * @description
 * This function iterates over all personalization attributes defined init
 * ALL_PERSONALIZATION_ATTRIBUTES and applies the corresponding values
 */
function _applyPersonalization(personalizationObject) {
  ALL_PERSONALIZATION_ATTRIBUTES.forEach((attr) => {
    const elements = document.querySelectorAll(`[${attr}]`);
    elements.forEach((el) => {
      const key = el.getAttribute(attr);
      if (key && personalizationObject[key]) {
        console.log(
          `Replacing ${attr}="${key}" with value:`,
          personalizationObject[key],
        );
        if (attr === PERSONALIZATION_ATTRIBUTE_COPY) {
          el.textContent = personalizationObject[key];
        } else if (attr === PERSONALIZATION_ATTRIBUTE_SRC) {
          el.src = personalizationObject[key];
        } else if (attr === PERSONALIZATION_ATTRIBUTE_HREF) {
          el.href = personalizationObject[key];
        } else {
          console.warn(
            `Unknown personalization attribute: ${attr}. Skipping replacement.`,
          );
        }
      }
      el.setAttribute(PERSONALIZATION_FLAG, "true"); // Mark as personalized
    });
  });
}

/**
 * Fetch personalization data for a cid/aid
 * @param {function<resultData>} callback
 * @returns {<{
 *   cid: string,
 *   aid?: string,
 *   isAnonimous: boolean,
 *   personalization: Object,
 * }>}
 */
async function getPersonalizationData(callback) {
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

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.statusText}`);
    }

    const responseJson = await response.json();

    console.log("Personalization data:", responseJson);
    const { data } = responseJson;
    const { aid: responseAid, personalization } = data || {};
    if (responseAid) {
      // If aid is present, set it as a cookie
      setCookie(AID_COOKIE_NAME, responseAid);
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
    throw error; // Re-throw to allow caller to handle
  }
}

export { init, sendEvent, getEvents, getEvent, getPersonalizationData };
