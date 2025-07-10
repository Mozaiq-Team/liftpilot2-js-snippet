import {
  ALL_PERSONALIZATION_ATTRIBUTES,
  PERSONALIZATION_ATTRIBUTE,
  PERSONALIZATION_ATTRIBUTE_COPY,
  PERSONALIZATION_ATTRIBUTE_SRC,
  PERSONALIZATION_ATTRIBUTE_HREF,
  PERSONALIZATION_FLAG,
} from "../constants.js";

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
        if (attr === PERSONALIZATION_ATTRIBUTE_COPY) {
          el.textContent = personalizationObject[key];
        } else if (attr === PERSONALIZATION_ATTRIBUTE_SRC) {
          el.src = personalizationObject[key];
        } else if (attr === PERSONALIZATION_ATTRIBUTE_HREF) {
          el.href = personalizationObject[key];
        } else if (attr === PERSONALIZATION_ATTRIBUTE) {
          const valueObj = personalizationObject[key];
          Object.entries(valueObj).forEach(([prop, value]) => {
            if (prop === "copy") {
              el.textContent = value;
            } else if (prop === "src") {
              el.setAttribute("src", value);
            } else if (prop === "href") {
              el.setAttribute("href", value);
            } else {
              // NOTE: think about how to handle other properties
              // For any other properties, set them as attributes
              // el.setAttribute(prop, value);
            }
          });
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

function _clearPersonalizationFlags() {
  ALL_PERSONALIZATION_ATTRIBUTES.forEach((attr) => {
    const elements = document.querySelectorAll(`[${attr}]`);
    elements.forEach((el) => {
      el.setAttribute(PERSONALIZATION_FLAG, "true");
    });
  });
}

export { _applyPersonalization, _clearPersonalizationFlags };
