import { sendEvent } from "./trackerCore.js";

let _inputTrackingInitialized = false;
function setupInputTracking() {
  console.log("Setting up input tracking");
  if (_inputTrackingInitialized) return;
  _inputTrackingInitialized = true;
  document.addEventListener("focusout", (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement) {
      // console.log("⚡ input blurred:", {
      //   name: el.name,
      //   value: el.value,
      //   type: el.type,
      // });

      if (el.type === "email") {
        // Check if valid email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(el.value)) {
          console.warn("⚠️ Invalid email format:", el.value);
          return; // Skip invalid emails
        }
      }

      if (el.value.trim() === "") {
        console.warn("⚠️ Input value is empty, skipping tracking");
        return; // Skip empty values
      }

      // Send the event with the input name and value
      sendEvent("input_blur", {
        formId: el.form ? el.form.id : "unknown",
        [el.name]: el.value,
      }).catch((err) => {
        console.error("Input blur tracking failed:", err);
      });
    }
  });
}

export { setupInputTracking };
