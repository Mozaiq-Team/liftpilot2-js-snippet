import "core-js/features/promise";
import "core-js/features/url-search-params";
import "whatwg-fetch";
import "regenerator-runtime/runtime";

import { getCookie, setCookie } from "./cookie.js";
import { generateId } from "./idGenerator.js";
import { setupRouteTracking } from "./routeTracker.js";
import { setupFormTracking } from "./formTracker.js";
import { setupInputTracking } from "./inputTracker.js";

let BASE_URL = "";
const COOKIE_NAME = "LP_COOKIE";

/**
 * Initialize with a base URL and ensure LP_COOKIE exists.
 * @param {{url: string}} options
 */
function init(options) {
  if (!options || typeof options.url !== "string") {
    throw new Error(
      "Liftpilot Event Tracking init requires an options object with a url property",
    );
  }
  BASE_URL = options.url.replace(/\/$/, ""); // remove trailing slash

  // If LP_COOKIE doesn’t exist yet, generate and set it.
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

  const cookieVal = getCookie(COOKIE_NAME) || "";
  const payload = { name, value: data };

  return fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cid": cookieVal, // send the cookie value here
    },
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

  const cookieVal = getCookie(COOKIE_NAME) || "";
  if (!cookieVal) {
    throw new Error(
      "No contact ID found. User tracking may not be initialized.",
    );
  }

  // Build query parameters
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // Only add filter if it has properties
  if (Object.keys(filter).length > 0) {
    params.append("filter", JSON.stringify(filter));
  }

  const url = `${BASE_URL}/events/${encodeURIComponent(name)}?${params}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-cid": cookieVal,
      },
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
 * @returns {Promise<any>}
 */
async function getEvent({ name }) {
  if (!BASE_URL) {
    throw new Error(
      "Liftpilot Event Tracking is not initialized. Call init() first.",
    );
  }

  const cookieVal = getCookie(COOKIE_NAME) || "";

  const url = `${BASE_URL}/events/${name}`;

  return fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-cid": cookieVal, // send the cookie value here
    },
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.statusText}`);
    }
    return response.json();
  });
}

export { init, sendEvent, getEvents, getEvent };
