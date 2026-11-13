/*
 * dashboard-view-card – zeigt die Karten einer Ansicht eines anderen Dashboards an.
 * Gedacht für Browser-Mod-Popups: das Popup zeigt dann genau das, was im
 * Ziel-Dashboard eingestellt ist (eine Stelle zum Pflegen).
 *
 *   type: custom:dashboard-view-card
 *   dashboard: tuer-sprechanlage   # url_path des Dashboards
 *   view: haustuer                 # Pfad oder Index der Ansicht (Standard 0)
 *   gap: 12                        # Abstand zwischen den Karten in px
 */
const DVC_VERSION = '1.1.0';

class DashboardViewCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.dashboard) throw new Error('dashboard fehlt (url_path des Dashboards)');
    this._config = { view: 0, gap: 12, ...config };
    this._loaded = false;
    if (this.isConnected) this._load();
  }

  set hass(hass) {
    this._hass = hass;
    (this._els || []).forEach(el => { el.hass = hass; });
    if (!this._loaded && !this._loading && this.isConnected) this._load();
  }

  connectedCallback() {
    if (!this._root) {
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = `<style>
        :host { display: block; }
        .wrap { display: flex; flex-direction: column; }
        .err { padding: 16px; color: var(--error-color, #db4437); }
      </style><div class="wrap"></div>`;
    }
    if (!this._loaded && this._config) this._load();
  }

  getCardSize() { return 8; }

  _findView(views, want) {
    if (want === undefined || want === null || want === '') return views[0];
    const byPath = views.find(v => v.path !== undefined && String(v.path) === String(want));
    if (byPath) return byPath;
    const i = Number(want);
    return Number.isInteger(i) ? views[i] : undefined;
  }

  _cardsOf(view) {
    if (Array.isArray(view.sections)) return view.sections.flatMap(s => s.cards || []);
    return view.cards || [];
  }

  async _load() {
    if (!this._hass || !this._root || !this._config) return;
    this._loading = true;
    const wrap = this._root.querySelector('.wrap');
    wrap.style.gap = `${Number(this._config.gap) || 0}px`;
    try {
      const conf = await this._hass.callWS({ type: 'lovelace/config', url_path: this._config.dashboard, force: true });
      const view = this._findView(conf.views || [], this._config.view);
      if (!view) throw new Error(`Ansicht "${this._config.view}" nicht gefunden in ${this._config.dashboard}`);
      // keine Endlosschleife, falls die Ansicht sich selbst einbettet
      const cards = this._cardsOf(view).filter(c => !(c && c.type === 'custom:dashboard-view-card' && c.dashboard === this._config.dashboard));
      const helpers = await window.loadCardHelpers();
      this._els = await Promise.all(cards.map(async cfg => {
        const el = await helpers.createCardElement(cfg);
        el.hass = this._hass;
        return el;
      }));
      wrap.replaceChildren(...this._els);
      this._loaded = true;
    } catch (e) {
      wrap.innerHTML = `<div class="err">${String((e && (e.message || e.code)) || e)}</div>`;
      this._loaded = true; // nicht bei jedem hass-Update erneut versuchen
    } finally {
      this._loading = false;
    }
  }
}

/*
 * klingel-kamera-card – Kamerabild für das Klingel-Popup, Kamera kommt aus einem Helfer.
 *
 *   type: custom:klingel-kamera-card
 *   helper: input_text.klingel_haustur_kamera   # Wert: auto | none | camera.xyz
 *   device_entity: event.vordereingang_klingeln # für "auto": Kamera desselben Geräts (falls vorhanden)
 *   camera_view: live                           # live | auto
 */
class KlingelKameraCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.helper) throw new Error('helper fehlt (input_text mit der Kamera)');
    this._config = { camera_view: 'live', ...config };
    this._cur = undefined;
  }
  getCardSize() { return 5; }
  // Kamera desselben Geräts wie device_entity (Integration bringt evtl. eine Kamera mit)
  static autoCamera(hass, entity) {
    const ents = (hass && hass.entities) || {}, dev = entity && ents[entity] && ents[entity].device_id;
    if (!dev) return null;
    const cam = Object.values(ents).find(e => e.device_id === dev && e.entity_id.startsWith('camera.'));
    return cam ? cam.entity_id : null;
  }
  set hass(hass) {
    this._hass = hass;
    const v = ((hass.states[this._config.helper] || {}).state || 'auto').trim();
    const cam = v === 'none' ? null : v.startsWith('camera.') ? v : KlingelKameraCard.autoCamera(hass, this._config.device_entity);
    const st = cam && hass.states[cam], ok = !!st && !['unavailable', 'unknown'].includes(st.state);
    const key = `${cam}|${ok}`;
    if (key !== this._cur) { this._cur = key; this._render(cam, ok); }
    if (this._el) this._el.hass = hass;
  }
  async _render(cam, ok) {
    this._el = null;
    if (!cam || !ok) {
      const msg = !cam ? (this._config.empty_text || '📷 Keine Kamera für diese Tür eingestellt.') : `📷 Kamera ${cam} ist gerade nicht erreichbar.`;
      this.innerHTML = `<ha-card style="padding:14px 16px;color:var(--secondary-text-color)">${msg}</ha-card>`;
      return;
    }
    const helpers = await window.loadCardHelpers();
    const el = await helpers.createCardElement({ type: 'picture-entity', entity: cam, camera_view: this._config.camera_view, show_name: false, show_state: false, tap_action: { action: 'more-info' } });
    el.hass = this._hass; this._el = el;
    this.replaceChildren(el);
  }
}

if (!customElements.get('klingel-kamera-card')) customElements.define('klingel-kamera-card', KlingelKameraCard);

if (!customElements.get('dashboard-view-card')) {
  customElements.define('dashboard-view-card', DashboardViewCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'dashboard-view-card', name: 'Dashboard-Ansicht einbetten', description: 'Zeigt die Karten einer Ansicht eines anderen Dashboards (z. B. im Browser-Mod-Popup).' });
  console.info(`%c dashboard-view-card ${DVC_VERSION} `, 'background:#1f6feb;color:#fff;border-radius:3px');
}
