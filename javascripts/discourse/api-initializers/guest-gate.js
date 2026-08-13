import { apiInitializer } from "discourse/lib/api";
import GuestGateModal from "../components/modal/guest-gate";
import { cleanupLightboxes } from "discourse/lib/lightbox";

const SESSION_KEY = "discourse-guest-gate:shown";

export default apiInitializer("1.8.0", (api) => { 
  const currentUser = api.container.lookup("service:current-user");

  if (currentUser) {
    return;
  }

  const modal = api.container.lookup("service:modal");
  const controller = createGateController(api, modal);
  controller.start();
});

function createGateController(api, modal) {
  let pageViews = 0;
  let requiredPageViews = getPageViewThreshold();
  let modalOpen = false;
  let gateShownThisSession = readSessionFlag();
  let currentPageEligible = false;
  let timeTimer = null;
  let showTimer = null;
  let scrollListener = null;

  const triggerMode = getTriggerMode();

  function start() {
    api.onPageChange((url) => {
      clearPageTimer();
      clearShowTimer();
      resetPageTriggers();

      currentPageEligible = matchesGateVisibility(url);
      if (!currentPageEligible || shouldStopForSession()) {
        return;
      }

      if (usesPageViews()) {
        pageViews += 1;
        if (pageViews >= requiredPageViews) {
          scheduleGate("page_view");
        }
      }

      if (usesTime()) {
        startTimeTrigger();
      }

      if (usesScroll()) {
        installScrollTrigger();
        checkScrollTrigger();
      }
    });

    if (usesLightbox()) {
      api.onAppEvent("lightbox:opened", () => {
        if (!currentPageEligible || shouldStopForSession()) {
          return;
        }

        if (scheduleGate("lightbox")) {
          cleanupLightboxes();
        }
      });
    }

    if (settings.gate_show_when_thumbnail_clicked && triggerMode !== "lightbox") {
      api.onAppEvent("lightbox:opened", () => {
        if (!currentPageEligible || shouldStopForSession()) {
          return;
        }

        if (scheduleGate("lightbox")) {
          cleanupLightboxes();
        }
      });
    }
  }

  function scheduleGate(reason) {
    if (!canShowGate()) {
      return false;
    }

    clearShowTimer();

    const delay = getShowDelay();
    if (delay === 0) {
      showGate(reason);
      return true;
    }

    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (canShowGate()) {
        showGate(reason);
      }
    }, delay);

    return true;
  }

  function showGate() {
    if (!canShowGate()) {
      return false;
    }

    modalOpen = true;
    modal
      .show(GuestGateModal)
      .finally(() => {
        modalOpen = false;
      });

    markGateShown();
    resetAfterGate();
    return true;
  }

  function canShowGate() {
    return currentPageEligible && !modalOpen && !shouldStopForSession();
  }

  function markGateShown() {
    const oncePerSession =
      settings.gate_show_only_once || getRepeatMode() === "once_per_session";

    if (oncePerSession) {
      gateShownThisSession = true;
      writeSessionFlag();
    }
  }

  function resetAfterGate() {
    clearShowTimer();
    resetPageTriggers();

    if (usesPageViews()) {
      pageViews = 0;
      requiredPageViews = getNextPageViewThreshold();
    }

    if (!shouldStopForSession() && currentPageEligible) {
      if (usesTime()) {
        startTimeTrigger();
      }

      if (usesScroll()) {
        installScrollTrigger();
        checkScrollTrigger();
      }
    }
  }

  function resetPageTriggers() {
    clearPageTimer();
    removeScrollTrigger();
  }

  function startTimeTrigger() {
    const seconds = getTimeThreshold();
    timeTimer = window.setTimeout(() => {
      timeTimer = null;
      scheduleGate("time");
    }, seconds * 1000);
  }

  function installScrollTrigger() {
    if (scrollListener) {
      return;
    }

    scrollListener = () => checkScrollTrigger();
    window.addEventListener("scroll", scrollListener, { passive: true });
  }

  function removeScrollTrigger() {
    if (!scrollListener) {
      return;
    }

    window.removeEventListener("scroll", scrollListener);
    scrollListener = null;
  }

  function checkScrollTrigger() {
    if (!currentPageEligible || shouldStopForSession() || !usesScroll()) {
      return;
    }

    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent =
      scrollableHeight <= 0
        ? 100
        : (window.scrollY / scrollableHeight) * 100;

    if (percent >= getScrollThreshold()) {
      scheduleGate("scroll");
    }
  }

  function clearPageTimer() {
    if (timeTimer) {
      window.clearTimeout(timeTimer);
      timeTimer = null;
    }
  }

  function clearShowTimer() {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
  }

  function shouldStopForSession() {
    return (
      settings.gate_show_only_once || getRepeatMode() === "once_per_session"
    ) && gateShownThisSession;
  }

  function getNextPageViewThreshold() {
    if (getRepeatMode() !== "random_page_views" || !usesPageViews()) {
      return getPageViewThreshold();
    }

    return randomInt(1, getRepeatPageViewThreshold());
  }

  function getTriggerMode() {
    if (settings.gate_show_when_thumbnail_clicked) {
      return "lightbox";
    }

    return settings.gate_trigger_mode || "page_views";
  }

  function usesPageViews() {
    return triggerMode === "page_views" || triggerMode === "any";
  }

  function usesTime() {
    return triggerMode === "time" || triggerMode === "any";
  }

  function usesScroll() {
    return triggerMode === "scroll" || triggerMode === "any";
  }

  function usesLightbox() {
    return triggerMode === "lightbox" || triggerMode === "any";
  }

  return { start };
}

function getTriggerMode() {
  if (settings.gate_show_when_thumbnail_clicked) {
    return "lightbox";
  }

  return settings.gate_trigger_mode || "page_views";
}

function getRepeatMode() {
  return settings.gate_repeat_mode || "repeat_trigger";
}

function getPageViewThreshold() {
  return positiveInteger(settings.page_view_threshold, 1);
}

function getRepeatPageViewThreshold() {
  return positiveInteger(settings.repeat_page_view_threshold, 3);
}

function getTimeThreshold() {
  return positiveInteger(settings.time_threshold_seconds, 30);
}

function getScrollThreshold() {
  return Math.min(100, positiveInteger(settings.scroll_threshold_percent, 50));
}

function getShowDelay() {
  return Math.max(0, positiveInteger(settings.gate_show_delay_ms, 0));
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function matchesGateVisibility(url) {
  const path = normalizePath(url);
  const showPatterns = splitPatterns(settings.url_for_show);
  const hidePatterns = splitPatterns(settings.url_for_hide);

  const shouldShow =
    showPatterns.length === 0 ||
    showPatterns.some((pattern) => matchesPattern(path, pattern));
  const shouldHide = hidePatterns.some((pattern) => matchesPattern(path, pattern));

  return shouldShow && !shouldHide;
}

function splitPatterns(value) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((pattern) => normalizePath(pattern.trim()))
    .filter(Boolean);
}

function normalizePath(value) {
  if (!value) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);
    return url.pathname + url.search + url.hash;
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}

function matchesPattern(path, pattern) {
  if (pattern === "*") {
    return true;
  }

  if (pattern.endsWith("*")) {
    return path.startsWith(pattern.slice(0, -1));
  }

  return path === pattern;
}

function randomInt(min, max) {
  if (max <= min) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function readSessionFlag() {
  const oncePerSession =
    settings.gate_show_only_once || getRepeatMode() === "once_per_session";

  if (!oncePerSession) {
    return false;
  }

  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSessionFlag() {
  try {
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. The in-memory
    // flag still prevents duplicate gates during the current application run.
  }
}
