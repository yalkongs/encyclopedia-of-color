/*
 * <enc-module-shell> — page shell that wires i18n, a11y, and keyboard shortcuts
 * for every module. See module_specification.md §Ⅵ.5.
 *
 * Attributes:
 *   layout: "A" | "B" | "C"
 *   module-id: catalog id (e.g., "refraction-snell/snells-law")
 */

import { loadLocale, detectPreferredLang, setLang, getLang, translatePage, onLangChange } from '@core/locales/i18n-engine';
import { renderMath } from '@core/render/math';
import { isEmbedMode, isOgMode } from '@core/state/url-state';
import '@core/components/share-dialog';
import type { ShareDialog } from '@core/components/share-dialog';

export class ModuleShell extends HTMLElement {
  private _shareDialog: ShareDialog | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  async connectedCallback() {
    if (isEmbedMode()) this.setAttribute('data-embed', '1');
    if (isOgMode()) this.setAttribute('data-og', '1');
    await loadLocale(detectPreferredLang());
    this._applyReducedMotion();
    this._installShortcuts();
    this._renderHeaderControls();
    this._installShareDialog();
    this._installEmbedResizeProtocol();
    translatePage(this);
    renderMath(this);
    onLangChange(() => renderMath(this));
    // Sentinel for Playwright OG capture
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.setAttribute('data-ready', '1');
    }));
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
  }

  /**
   * Embed-mode iframe height protocol — supports two modes simultaneously:
   *
   *   1. Native protocol (enc-iframe-resize) — used by our embed loader
   *      and any host that listens for window.message of that type.
   *
   *   2. iframe-resizer compatibility — the de-facto standard library
   *      (https://iframe-resizer.com). When the host page uses
   *      iframe-resizer v5, we dynamically import @iframe-resizer/child
   *      so the parent iframe automatically fits its content.
   *
   * Both protocols are safe to run together: they use disjoint message
   * envelopes. Hosts pick whichever they prefer.
   */
  private _installEmbedResizeProtocol() {
    if (window === window.parent) return; // not in iframe

    // (1) Native protocol — always on inside iframe
    const moduleId = this.getAttribute('module-id') ?? '';
    const publish = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage(
        { type: 'enc-iframe-resize', moduleId, height, src: location.href },
        '*',
      );
    };
    publish();
    this._resizeObserver = new ResizeObserver(publish);
    this._resizeObserver.observe(document.documentElement);
    window.addEventListener('load', publish);
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'enc-iframe-request-size') publish();
    });

    // (2) iframe-resizer compat — lazy-load the child library.
    // The library is a no-op unless the parent also uses iframe-resizer,
    // so it costs us nothing when not needed.
    void import('@iframe-resizer/child').catch((err) => {
      console.warn('[iframe-resizer] failed to load child shim:', err);
    });
  }

  private _applyReducedMotion() {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => this.toggleAttribute('data-reduced-motion', mq.matches);
    apply();
    mq.addEventListener('change', apply);
  }

  private _installShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('reset-params', { bubbles: true }));
      } else if (e.key === '?') {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('shortcut-help', { bubbles: true }));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this._copyShareUrl();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.toggleAttribute('data-reduced-motion');
      }
    });
  }

  private _renderHeaderControls() {
    const chipRow = this.querySelector('.chip-row');
    if (!chipRow) return;

    // Right-side cluster: language switch + share button
    let cluster = chipRow.querySelector('.header-cluster') as HTMLElement | null;
    if (!cluster) {
      cluster = document.createElement('div');
      cluster.className = 'header-cluster';
      cluster.style.marginLeft = 'auto';
      cluster.style.display = 'inline-flex';
      cluster.style.alignItems = 'center';
      cluster.style.gap = 'var(--space-3)';
      chipRow.appendChild(cluster);
    }
    cluster.innerHTML = '';

    // Language switch
    const sw = document.createElement('div');
    sw.className = 'lang-switch';
    sw.style.display = 'inline-flex';
    sw.style.gap = '0';
    (['en', 'ko'] as const).forEach((lang) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = lang.toUpperCase();
      b.className = 'btn';
      b.style.fontSize = 'var(--fs-12)';
      b.style.padding = '2px 8px';
      b.style.borderRadius = '0';
      if (lang === getLang()) {
        b.setAttribute('aria-pressed', 'true');
        b.style.background = 'var(--text-0)';
        b.style.color = 'var(--bg-0)';
      }
      b.addEventListener('click', async () => {
        await setLang(lang);
        this._renderHeaderControls();
      });
      sw.appendChild(b);
    });
    cluster.appendChild(sw);

    // Share button (hidden in embed mode)
    if (!isEmbedMode()) {
      const share = document.createElement('button');
      share.type = 'button';
      share.className = 'btn share-trigger';
      share.style.fontSize = 'var(--fs-12)';
      share.textContent = 'Share';
      share.addEventListener('click', () => this._shareDialog?.open());
      cluster.appendChild(share);
    }

    // Canonical link in embed mode (replaces share)
    if (isEmbedMode()) {
      const link = document.createElement('a');
      link.className = 'btn canonical-link';
      link.style.fontSize = 'var(--fs-12)';
      link.textContent = '↗ Open full module';
      const u = new URL(window.location.href);
      u.searchParams.delete('embed');
      link.href = u.toString();
      link.target = '_top';
      link.rel = 'noopener';
      cluster.appendChild(link);
    }
  }

  private _installShareDialog() {
    if (isEmbedMode()) return;
    const dialog = document.createElement('enc-share-dialog') as ShareDialog;
    const moduleId = this.getAttribute('module-id') ?? 'unknown';
    const title = this.querySelector('.module-title')?.textContent?.trim() ?? moduleId;
    const refs = this.querySelector('enc-citation-footer')?.getAttribute('data-refs') ?? '';
    dialog.options = {
      moduleId,
      titleEn: title,
      titleKo: title,
      textbookRef: refs,
    };
    this.appendChild(dialog);
    this._shareDialog = dialog;
  }

  private async _copyShareUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard blocked — silent */
    }
  }
}

if (!customElements.get('enc-module-shell')) {
  customElements.define('enc-module-shell', ModuleShell);
}
