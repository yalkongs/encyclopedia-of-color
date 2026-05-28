/*
 * <enc-citation-footer> — intentionally renders nothing.
 *
 * Per-module source lines were removed to reclaim vertical space (especially on
 * mobile). All citations now live on the central /reference/ page, generated
 * from each module's meta.json `textbook_refs` and linked from the landing page.
 * The element is kept as an inert no-op so existing module markup stays valid.
 */

export class CitationFooter extends HTMLElement {
  connectedCallback() {
    // No-op: citations are centralised on the /reference/ page.
  }
}

if (!customElements.get('enc-citation-footer')) {
  customElements.define('enc-citation-footer', CitationFooter);
}
