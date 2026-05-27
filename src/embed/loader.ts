/*
 * Interactive Encyclopedia of Color — Embed Loader
 *
 * Bundled as a single file (`/embed/loader.js`) that hosts include once:
 *
 *   <script src="https://encyclopedia.color/embed/loader.js" defer></script>
 *
 * After load, drop any of the registered custom elements anywhere:
 *
 *   <color-snell-refraction state="theta1=42&n2=1.5"></color-snell-refraction>
 *   <color-sky-color lang="ko"></color-sky-color>
 *
 * Each element renders a sandboxed iframe pointing at the canonical embed URL,
 * isolated from the host page via Shadow DOM. iframe height auto-adjusts to
 * the module's content via the `enc-iframe-resize` postMessage protocol
 * published by the module shell.
 *
 * Attributes (all optional):
 *   state="…"   URL-encoded slider/toggle state (theta1=42&n2=1.5)
 *   lang="ko"   "en" (default) or "ko"
 *   theme="…"   reserved for future variants ("paper" is the current default)
 *   height="N"  initial pixel height before auto-resize kicks in (default 520)
 *   width="N|N%" iframe width (default "100%")
 *
 * Reads `data-base` from its own <script> tag to allow self-hosting:
 *   <script src="…/loader.js" data-base="https://my-mirror.com"></script>
 */

const REGISTRY = [
  { tag: 'color-sine-anatomy',     module: 'wave-fundamentals/sine-anatomy' },
  { tag: 'color-snell-refraction', module: 'refraction-snell/snells-law' },
  { tag: 'color-soap-bubble',      module: 'wave-interference/soap-bubble' },
  { tag: 'color-sky-color',        module: 'particle-scattering/sky-color' },
  { tag: 'color-cvd-everyday',     module: 'color-vision-deficiency/cvd-everyday' },
] as const;

// Determine canonical base URL from the loading <script> tag.
function detectBase(): string {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src*="loader.js"]');
  for (const s of scripts) {
    const fromAttr = s.dataset.base;
    if (fromAttr) return fromAttr.replace(/\/$/, '');
    if (s.src) {
      try {
        const u = new URL(s.src);
        // strip "/embed/loader.js"
        return `${u.origin}${u.pathname.replace(/\/embed\/loader\.js$/, '')}`;
      } catch { /* fallthrough */ }
    }
  }
  return '';
}

const BASE = detectBase();

class EncEmbedElement extends HTMLElement {
  static moduleId: string;
  private _iframe: HTMLIFrameElement | null = null;

  connectedCallback() {
    if (this._iframe) return;
    const moduleId = (this.constructor as typeof EncEmbedElement).moduleId;
    if (!moduleId) return;

    const shadow = this.attachShadow({ mode: 'open' });

    // Build URL: BASE/modules/<moduleId>/?embed=1&<state>
    const params = new URLSearchParams();
    params.set('embed', '1');
    const stateAttr = this.getAttribute('state');
    if (stateAttr) {
      // Allow either "k=v&k2=v2" or "?k=v…" forms
      const cleaned = stateAttr.replace(/^\?/, '');
      for (const pair of cleaned.split('&')) {
        const [k, v] = pair.split('=');
        if (k) params.set(k, v ?? '');
      }
    }
    const lang = this.getAttribute('lang');
    if (lang) params.set('lang', lang);

    const src = `${BASE}/modules/${moduleId}/?${params.toString()}`;
    const initialHeight = this.getAttribute('height') ?? '520';
    const width = this.getAttribute('width') ?? '100%';

    const wrap = document.createElement('div');
    wrap.style.cssText = `display:block;width:${width};max-width:100%;font-family:system-ui,sans-serif;`;

    this._iframe = document.createElement('iframe');
    this._iframe.src = src;
    this._iframe.style.cssText = `
      display: block;
      width: 100%;
      height: ${initialHeight}px;
      border: 1px solid #d8cfb5;
      background: #f8f2e4;
      box-sizing: border-box;
    `;
    this._iframe.setAttribute('loading', 'lazy');
    this._iframe.setAttribute('frameborder', '0');
    this._iframe.setAttribute('allowfullscreen', '');
    this._iframe.setAttribute(
      'title',
      `${this.tagName.toLowerCase()} — Interactive Encyclopedia of Color`,
    );

    wrap.appendChild(this._iframe);
    shadow.appendChild(wrap);

    // Listen for height postMessage from the embedded module
    const onMessage = (e: MessageEvent) => {
      if (!this._iframe) return;
      const data = e.data;
      if (!data || data.type !== 'enc-iframe-resize') return;
      // Only accept messages whose source iframe matches ours (basic origin guard)
      if (e.source !== this._iframe.contentWindow) return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > 0) {
        this._iframe.style.height = `${h}px`;
      }
    };
    window.addEventListener('message', onMessage);
    (this as unknown as { _onMessage: (e: MessageEvent) => void })._onMessage = onMessage;
  }

  disconnectedCallback() {
    const handler = (this as unknown as { _onMessage?: (e: MessageEvent) => void })._onMessage;
    if (handler) window.removeEventListener('message', handler);
  }
}

for (const { tag, module } of REGISTRY) {
  if (customElements.get(tag)) continue;
  const cls = class extends EncEmbedElement {
    static override moduleId = module;
  };
  customElements.define(tag, cls);
}

// Expose for programmatic creation
(window as unknown as { EncyclopediaOfColor: unknown }).EncyclopediaOfColor = {
  modules: REGISTRY.map((r) => r.tag),
  base: BASE,
};
