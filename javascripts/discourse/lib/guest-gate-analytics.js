// Lightweight, privacy-conscious analytics helper.
// Forwards events to window.dataLayer (GTM/GA4) or dispatches a 
// 'discourse-guest-gate:analytics' CustomEvent on document for custom integrations.
// Active only when 'enable_analytics' is enabled; sends no PII.

export function trackGuestGateEvent(eventName, payload = {}) {
  if (!settings.enable_analytics) {
    return;
  }

  const detail = {
    event: eventName,
    guest_gate_timestamp: Date.now(),
    ...payload,
  };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
  } catch {
    // dataLayer can be unavailable (blocked by an ad/tracker blocker, or a
    // strict CSP). Never let analytics break the gate itself.
  }

  try {
    document.dispatchEvent(
      new CustomEvent("discourse-guest-gate:analytics", { detail })
    );
  } catch {
    // CustomEvent is universally supported, but guard defensively anyway.
  }

  if (settings.analytics_debug_logging) {
    // eslint-disable-next-line no-console
    console.log("[guest-gate analytics]", detail);
  }
}

export function currentPath() {
  return window.location.pathname + window.location.search;
}
