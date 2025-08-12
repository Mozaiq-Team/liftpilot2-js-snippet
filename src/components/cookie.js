/**
 * Cookie utility functions for managing browser cookies.
 * @module cookie
 */

// Cookie cache for improved performance
const cookieCache = new Map();

/**
 * Read a cookie by name.
 * @param {string} name - The name of the cookie to read
 * @returns {string|null} The cookie value or null if not found
 * @throws {Error} If name is not a string
 */
function getCookie(name) {
  if (typeof name !== "string") {
    throw new Error("Cookie name must be a string");
  }

  const microtime = performance.now();
  console.log(`getCookie(${name}) at ${microtime}`);

  // Check cache first
  if (cookieCache.has(name)) {
    const value = cookieCache.get(name);
    console.log(`getCookie(${name}) from cache: ${value}`);
    return value;
  }

  const matches = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()[]\\\/+^])/g, "\\$1") + "=([^;]*)",
    ),
  );
  const value = matches ? decodeURIComponent(matches[1]) : null;
  
  console.log(`getCookie(${name}) from document.cookie: ${value}`);
  
  // Cache the result
  cookieCache.set(name, value);
  return value;
}

/**
 * Set a cookie with configurable options.
 * @param {string} name - The name of the cookie
 * @param {string} value - The value to store in the cookie
 * @param {Object} options - Cookie options
 * @param {number} [options.days=365] - Number of days until cookie expires
 * @param {string} [options.path='/'] - Cookie path
 * @param {string} [options.domain] - Cookie domain
 * @param {boolean} [options.secure=true] - Whether the cookie should only be sent over HTTPS
 * @param {string} [options.sameSite='Lax'] - SameSite attribute ('Strict', 'Lax', or 'None')
 * @throws {Error} If name or value is not a string
 */
function setCookie(name, value, options = {}) {
  if (typeof name !== "string" || typeof value !== "string") {
    throw new Error("Cookie name and value must be strings");
  }
  
  const microtime = performance.now();
  console.log(`setCookie(${name}, ${value}) at ${microtime}`);
  
  // Auto-detect if we should use secure based on protocol
  const isHttps = window.location.protocol === "https:";

  // Update cache
  cookieCache.set(name, value);
  console.log(`setCookie(${name}) updated cache with: ${value}`);

  const {
    days = 365,
    path = "/",
    domain,
    secure = isHttps,
    sameSite = "Lax",
  } = options;

  let expires = "";
  if (typeof days === "number") {
    const date = new Date();
    date.setTime(date.getTime() + days * 864e5);
    expires = `; expires=${date.toUTCString()}`;
  }

  let cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}`;

  if (domain) {
    cookie += `; domain=${domain}`;
  }

  if (secure) {
    cookie += "; secure";
  }

  if (sameSite) {
    cookie += `; samesite=${sameSite}`;
  }

  document.cookie = cookie;
}

/**
 * Delete a cookie by setting its expiration date to the past.
 * @param {string} name - The name of the cookie to delete
 * @param {Object} options - Cookie options (same as setCookie)
 * @throws {Error} If name is not a string
 */
function deleteCookie(name, options = {}) {
  if (typeof name !== "string") {
    throw new Error("Cookie name must be a string");
  }

  // Remove from cache
  cookieCache.delete(name);

  setCookie(name, "", { ...options, days: -1 });

}

export { getCookie, setCookie, deleteCookie };
