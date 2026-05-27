/*
 * <enc-citation-footer> — renders module citations from inline children
 * or from a `data-refs` attribute (semicolon-separated).
 *
 * In v0 we accept hand-written children; later a build step will inject
 * from refs.bib + meta.json.
 */

export class CitationFooter extends HTMLElement {
  connectedCallback() {
    if (this.children.length > 0) {
      this._enhance();
      return;
    }
    // Fallback rendering from data-refs.
    const refs = (this.getAttribute('data-refs') ?? '').split(';').map((s) => s.trim()).filter(Boolean);
    if (refs.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'module-footer';

    const source = document.createElement('div');
    source.className = 'citation';
    source.innerHTML = `<span data-i18n="ui.source">Source</span> · ${refs.join(' · ')}`;
    wrap.appendChild(source);

    this.appendChild(wrap);
  }

  private _enhance() {
    if (!this.classList.contains('module-footer')) {
      this.classList.add('module-footer');
    }
  }
}

if (!customElements.get('enc-citation-footer')) {
  customElements.define('enc-citation-footer', CitationFooter);
}
