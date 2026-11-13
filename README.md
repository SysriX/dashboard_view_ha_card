# Dashboard View Card

Two small helper cards in one file:

- **`custom:dashboard-view-card`** – renders the cards of one view of *another* dashboard. Designed for Browser Mod popups: the popup shows exactly what is configured in the target dashboard, so there is only one place to maintain.
- **`custom:klingel-kamera-card`** – camera picture for a doorbell popup; the camera is chosen through an `input_text` helper (`auto`, `none` or a `camera.*` entity).

UI language: German (error/empty messages).

## Requirements

None. Typically used together with [Browser Mod](https://github.com/thomasloven/hass-browser_mod) popups.

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/SysriX/dashboard_view_ha_card`, category **Dashboard**.
2. Install the card from HACS and reload the browser.
3. HACS registers the resource automatically: `/hacsfiles/dashboard_view_ha_card/dashboard_view_ha_card.js` (JavaScript module).

### Manual

1. Copy `dist/dashboard_view_ha_card.js` to `/config/www/dashboard_view_ha_card.js`.
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/dashboard_view_ha_card.js` as **JavaScript module**.
3. Reload the browser.

## Configuration

### dashboard-view-card

```yaml
type: custom:dashboard-view-card
dashboard: door-intercom   # required: url_path of the source dashboard
view: front-door           # path or index of the view (default 0)
gap: 12                    # gap between cards in px (default 12)
```

Works with masonry views (`cards`) and sections views (all cards of all sections). A card that embeds its own dashboard is skipped to avoid loops. The user needs read access to the source dashboard.

### klingel-kamera-card

```yaml
type: custom:klingel-kamera-card
helper: input_text.doorbell_camera        # required: value auto | none | camera.xyz
device_entity: event.front_door_ding      # for "auto": use a camera of the same device
camera_view: live                         # live | auto (default live)
empty_text: No camera configured          # optional text when no camera is set
```

## Notes

This card was built for the author's own home and tablets. Some defaults (entity ids, dashboard paths) reflect that setup and may need to be set explicitly in your configuration.

## Version

1.1.0

## License

MIT – see [LICENSE](LICENSE).
