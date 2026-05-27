/*
 * KaTeX render helper.
 *
 * Walks a subtree and renders every element matching `.math` (inline) or
 * `.math-block` (display style) into the proper KaTeX HTML. Source LaTeX is
 * read from the `data-tex` attribute (preferred) or the element's textContent
 * if no attribute is present.
 *
 * Idempotent: a successfully-rendered element gets `data-tex-rendered="1"`
 * and is skipped on subsequent calls.
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface RenderOptions {
  /** Override KaTeX `throwOnError`. Default false — render errors show the raw source. */
  throwOnError?: boolean;
}

export function renderMath(root: ParentNode = document, opts: RenderOptions = {}): void {
  const elements = root.querySelectorAll<HTMLElement>('.math, .math-block');
  elements.forEach((el) => {
    if (el.dataset.texRendered === '1') return;
    const isBlock = el.classList.contains('math-block');
    const src = (el.dataset.tex ?? el.textContent ?? '').trim();
    if (!src) return;
    try {
      el.innerHTML = katex.renderToString(src, {
        displayMode: isBlock,
        throwOnError: opts.throwOnError ?? false,
        output: 'html',
        strict: 'ignore',
      });
      el.dataset.texRendered = '1';
    } catch (err) {
      console.warn('[katex] render failed:', src, err);
    }
  });
}
