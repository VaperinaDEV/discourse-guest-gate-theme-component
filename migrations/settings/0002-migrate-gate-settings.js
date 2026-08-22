export default function migrate(settings) {
  const oldMaxViews = Number.parseInt(settings.get("max_guest_topic_views"), 10);

  if (Number.isFinite(oldMaxViews) && oldMaxViews > 0) {
    settings.set("page_view_threshold", oldMaxViews);
    settings.set("repeat_page_view_threshold", oldMaxViews);
    settings.set("gate_repeat_mode", "random_page_views");
  }

  const oldDismissableFalse = settings.get("dismissable_false");
  if (oldDismissableFalse !== undefined && oldDismissableFalse !== null) {
    settings.set("dismissable", !oldDismissableFalse);
  }

  if (settings.get("gate_show_when_thumbnail_clicked")) {
    settings.set("gate_trigger_mode", "lightbox");
    settings.set("gate_show_when_thumbnail_clicked", false);
  }

  return settings;
}
