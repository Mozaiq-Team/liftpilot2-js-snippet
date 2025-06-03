(function (global) {
  let BASE_URL = "";
  const COOKIE_NAME = "LP_COOKIE";

  /**
   * Generate a random alphanumeric string (length = 16 by default).
   */
  function generateRandomString(length = 16) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Read a cookie by name. Returns null if not found.
   */
  function getCookie(name) {
    const matches = document.cookie.match(
      new RegExp(
        "(?:^|; )" +
          name.replace(/([.$?*|{}()[]\\\/+^])/g, "\\$1") +
          "=([^;]*)",
      ),
    );
    return matches ? decodeURIComponent(matches[1]) : null;
  }

  /**
   * Set a cookie (default expiration = 365 days, path = "/").
   */
  function setCookie(name, value, days = 365) {
    let expires = "";
    if (typeof days === "number") {
      const date = new Date();
      date.setTime(date.getTime() + days * 864e5);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie =
      name + "=" + encodeURIComponent(value) + expires + "; path=/";
  }

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
      cookieVal = generateRandomString(16);
      setCookie(COOKIE_NAME, cookieVal);
    }
  }

  /**
   * Send an event payload to POST <baseUrl>/events, including LP_COOKIE in header.
   * @param {string} name
   * @param {string} type
   * @param {any} data
   * @returns {Promise<any>}
   */
  async function sendEvent(name, type, data) {
    if (!BASE_URL) {
      throw new Error(
        "Liftpilot Event Tracking is not initialized. Call init() first.",
      );
    }
    if (!name || typeof name !== "string") {
      return Promise.reject(new Error("Event name must be a non-empty string"));
    }

    const payload = { eventName: name, eventType: type, eventData: data };
    const cookieVal = getCookie(COOKIE_NAME) || "";

    return fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LP-Cookie": cookieVal, // send the cookie value here
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
   * @param {Object} queryParams  (e.g. { name: "foo", type: "bar" })
   * @returns {Promise<any[]>}
   */
  async function getEvents(queryParams) {
    if (!BASE_URL) {
      throw new Error(
        "Liftpilot Event Tracking is not initialized. Call init() first.",
      );
    }

    const cookieVal = getCookie(COOKIE_NAME) || "";
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${BASE_URL}/events?${queryString}`;

    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-LP-Cookie": cookieVal, // send the cookie value here
      },
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to query events: ${response.statusText}`);
      }
      return response.json();
    });
  }

  // Expose only these three methods on the global object.
  global.LPTracker = {
    init: init,
    sendEvent: sendEvent,
    getEvents: getEvents,
  };
})(window);
