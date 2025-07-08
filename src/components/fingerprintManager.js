import FingerprintJS from "@fingerprintjs/fingerprintjs";

let fpAgent = null;
let fpPromise = null;

/**
 * Initialize FingerprintJS agent
 * @param {Object} options - FingerprintJS options
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {Promise<void>}
 */
async function initFingerprint(options = {}) {
  if (fpPromise) {
    return fpPromise;
  }

  fpPromise = FingerprintJS.load({
    debug: options.debug || false,
    monitoring: false, // Disable usage statistics
  });

  try {
    fpAgent = await fpPromise;
  } catch (error) {
    console.error("Failed to initialize FingerprintJS:", error);
    fpAgent = null;
    fpPromise = null;
    throw error;
  }

  return fpAgent;
}

/**
 * Get visitor fingerprint ID
 * @returns {Promise<string|null>} The visitor ID or null if fingerprinting failed
 */
async function getVisitorId() {
  if (!fpAgent) {
    console.warn(
      "FingerprintJS not initialized. Call initFingerprint() first.",
    );
    return null;
  }

  try {
    const result = await fpAgent.get();
    return result.visitorId;
  } catch (error) {
    console.error("Failed to get visitor ID:", error);
    return null;
  }
}

/**
 * Get detailed fingerprint information including confidence score
 * @returns {Promise<Object|null>} The fingerprint result or null if failed
 */
async function getFingerprint() {
  if (!fpAgent) {
    console.warn(
      "FingerprintJS not initialized. Call initFingerprint() first.",
    );
    return null;
  }

  try {
    const result = await fpAgent.get();
    return {
      visitorId: result.visitorId,
      confidence: result.confidence,
      components: result.components,
    };
  } catch (error) {
    console.error("Failed to get fingerprint:", error);
    return null;
  }
}

/**
 * Check if fingerprinting is available and initialized
 * @returns {boolean} True if fingerprinting is ready
 */
function isAvailable() {
  return fpAgent !== null;
}

export { initFingerprint, getVisitorId, getFingerprint, isAvailable };

