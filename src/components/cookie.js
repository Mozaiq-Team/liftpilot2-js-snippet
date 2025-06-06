/**
 * Read a cookie by name. Returns null if not found.
 */
function getCookie(name) {
  const matches = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()[]\\\/+^])/g, "\\$1") + "=([^;]*)",
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

export { getCookie, setCookie };
