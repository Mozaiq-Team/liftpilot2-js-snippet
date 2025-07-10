import {
  ALL_PERSONALIZATION_ATTRIBUTES,
  PERSONALIZATION_FLAG,
} from "../constants.js";

/**
 * Set up a style element to hide elements until personalization is applied.
 */
function setStyles() {
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
}

export { setStyles };
