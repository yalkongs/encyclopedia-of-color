/*
 * <enc-share-dialog> — modal for sharing a module's current state.
 *
 * Surfaces three concurrent affordances:
 *   1) Deep-state URL (copy + social one-clicks)
 *   2) Embed code (iframe snippet with width/height controls)
 *   3) Academic citation (BibTeX)
 *
 * Opens via the [Share] button in the module header, or programmatically
 * via .open(). Closes on backdrop click, Escape, or × button.
 */

export interface ShareDialogOptions {
  moduleId: string;
  titleEn: string;
  titleKo: string;
  textbookRef: string;
  doi?: string;
}

export class ShareDialog extends HTMLElement {
  private _opts: ShareDialogOptions | null = null;
  private _backdrop!: HTMLDivElement;
  private _panel!: HTMLDivElement;

  set options(o: ShareDialogOptions) {
    this._opts = o;
  }

  open() {
    if (!this._opts) return;
    if (!this._backdrop) this._render();
    this._refresh();
    this._backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => (this.querySelector('.copy-url') as HTMLButtonElement)?.focus());
  }

  close() {
    if (this._backdrop) {
      this._backdrop.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  private _render() {
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'share-backdrop';
    this._backdrop.addEventListener('click', (e) => {
      if (e.target === this._backdrop) this.close();
    });

    this._panel = document.createElement('div');
    this._panel.className = 'share-panel';
    this._backdrop.appendChild(this._panel);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._backdrop.style.display === 'flex') this.close();
    });

    this.appendChild(this._backdrop);
  }

  private _refresh() {
    if (!this._opts) return;
    const url = window.location.href;
    const embedUrl = this._buildEmbedUrl(url);
    const iframeCode = this._buildIframe(embedUrl, 720, 520);
    const bibtex = this._buildBibtex();
    const ris = this._buildRis();

    this._panel.innerHTML = `
      <div class="share-header">
        <div class="share-title">Share this module</div>
        <button class="btn share-close" aria-label="Close">✕</button>
      </div>

      <section class="share-section">
        <div class="share-label">Current state URL</div>
        <div class="share-row">
          <input class="share-input" type="text" readonly value="${escapeHtml(url)}">
          <button class="btn copy-url" data-copy="${escapeAttr(url)}">Copy</button>
        </div>
        <div class="share-social">
          <a class="btn" target="_blank" rel="noopener"
             href="https://twitter.com/intent/tweet?text=${encodeURIComponent(this._opts.titleEn)}&url=${encodeURIComponent(url)}">
            X / Twitter
          </a>
          <a class="btn" target="_blank" rel="noopener"
             href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">
            Facebook
          </a>
          <a class="btn" target="_blank" rel="noopener"
             href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">
            LinkedIn
          </a>
          <a class="btn" target="_blank" rel="noopener"
             href="mailto:?subject=${encodeURIComponent(this._opts.titleEn)}&body=${encodeURIComponent(url)}">
            Email
          </a>
        </div>
      </section>

      <section class="share-section">
        <div class="share-label">Embed in your site</div>
        <textarea class="share-textarea iframe-code" readonly rows="3">${escapeHtml(iframeCode)}</textarea>
        <div class="share-dim-row">
          <label>Width <select class="dim-w">
            <option value="100%" selected>100%</option>
            <option value="720">720</option>
            <option value="640">640</option>
            <option value="540">540</option>
            <option value="480">480</option>
          </select></label>
          <label>Height <select class="dim-h">
            <option value="520" selected>520</option>
            <option value="480">480</option>
            <option value="420">420</option>
            <option value="360">360</option>
          </select></label>
          <button class="btn copy-iframe">Copy code</button>
        </div>
      </section>

      <section class="share-section">
        <div class="share-label">Academic citation</div>
        <div class="cite-tabs" role="tablist">
          <button class="btn cite-tab" data-fmt="bibtex" aria-pressed="true">BibTeX</button>
          <button class="btn cite-tab" data-fmt="ris">RIS</button>
        </div>
        <textarea class="share-textarea cite-code" readonly rows="6">${escapeHtml(bibtex)}</textarea>
        <div class="share-dim-row">
          <button class="btn copy-cite">Copy</button>
          <button class="btn download-cite">Download .bib</button>
        </div>
      </section>
    `;

    this._wireEvents(embedUrl, { bibtex, ris });
  }

  private _wireEvents(initialEmbedUrl: string, cite: { bibtex: string; ris: string }) {
    this._panel.querySelector('.share-close')?.addEventListener('click', () => this.close());

    const installCopy = (el: HTMLButtonElement, getText: () => string) => {
      el.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(getText());
          const orig = el.textContent;
          el.textContent = 'Copied';
          setTimeout(() => (el.textContent = orig), 1200);
        } catch {
          /* clipboard blocked */
        }
      });
    };

    const copyUrlBtn = this._panel.querySelector('.copy-url') as HTMLButtonElement;
    installCopy(copyUrlBtn, () => copyUrlBtn.dataset.copy ?? '');

    const iframeBox = this._panel.querySelector('.iframe-code') as HTMLTextAreaElement;
    const widthSel = this._panel.querySelector('.dim-w') as HTMLSelectElement;
    const heightSel = this._panel.querySelector('.dim-h') as HTMLSelectElement;
    const copyIframeBtn = this._panel.querySelector('.copy-iframe') as HTMLButtonElement;

    const updateIframe = () => {
      const w = widthSel.value === '100%' ? '100%' : Number(widthSel.value);
      const h = Number(heightSel.value);
      iframeBox.value = this._buildIframe(initialEmbedUrl, w, h);
    };
    widthSel.addEventListener('change', updateIframe);
    heightSel.addEventListener('change', updateIframe);
    installCopy(copyIframeBtn, () => iframeBox.value);

    // Citation tabs (BibTeX ↔ RIS)
    const citeBox = this._panel.querySelector('.cite-code') as HTMLTextAreaElement;
    const copyCiteBtn = this._panel.querySelector('.copy-cite') as HTMLButtonElement;
    const downloadCiteBtn = this._panel.querySelector('.download-cite') as HTMLButtonElement;
    const tabs = Array.from(this._panel.querySelectorAll('.cite-tab')) as HTMLButtonElement[];
    let currentFmt: 'bibtex' | 'ris' = 'bibtex';

    const setFmt = (fmt: 'bibtex' | 'ris') => {
      currentFmt = fmt;
      citeBox.value = cite[fmt];
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.fmt === fmt)));
      downloadCiteBtn.textContent = fmt === 'bibtex' ? 'Download .bib' : 'Download .ris';
    };
    tabs.forEach((t) => t.addEventListener('click', () => setFmt(t.dataset.fmt as 'bibtex' | 'ris')));
    installCopy(copyCiteBtn, () => citeBox.value);
    downloadCiteBtn.addEventListener('click', () => {
      const ext = currentFmt === 'bibtex' ? 'bib' : 'ris';
      const key = (this._opts?.moduleId ?? 'module').replace(/\//g, '-');
      this._downloadFile(`${key}.${ext}`, citeBox.value, currentFmt === 'bibtex' ? 'application/x-bibtex' : 'application/x-research-info-systems');
    });
  }

  private _downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  private _buildEmbedUrl(currentUrl: string): string {
    const u = new URL(currentUrl);
    u.searchParams.set('embed', '1');
    return u.toString();
  }

  private _buildIframe(src: string, width: number | string, height: number): string {
    const w = typeof width === 'number' ? `${width}` : width;
    return `<iframe src="${src}"
        width="${w}" height="${height}"
        loading="lazy" frameborder="0" allowfullscreen
        title="${this._opts?.titleEn ?? ''} — Interactive Encyclopedia of Color"
        style="border: 1px solid #ddd; max-width: 100%;"></iframe>`;
  }

  private _buildBibtex(): string {
    if (!this._opts) return '';
    const key = this._opts.moduleId.replace(/[\/]/g, '-');
    const doi = this._opts.doi ?? `10.5281/zenodo.PLACEHOLDER`;
    const year = new Date().getFullYear();
    return `@misc{${key},
  title  = {${this._opts.titleEn}},
  author = {Interactive Encyclopedia of Color},
  year   = {${year}},
  doi    = {${doi}},
  url    = {${window.location.href}},
  note   = {${this._opts.textbookRef}}
}`;
  }

  private _buildRis(): string {
    if (!this._opts) return '';
    const year = new Date().getFullYear();
    const doi = this._opts.doi ?? `10.5281/zenodo.PLACEHOLDER`;
    return [
      'TY  - ELEC',
      `TI  - ${this._opts.titleEn}`,
      `AU  - Interactive Encyclopedia of Color`,
      `PY  - ${year}`,
      `DO  - ${doi}`,
      `UR  - ${window.location.href}`,
      `N1  - ${this._opts.textbookRef}`,
      'ER  - ',
      '',
    ].join('\r\n');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

if (!customElements.get('enc-share-dialog')) {
  customElements.define('enc-share-dialog', ShareDialog);
}
