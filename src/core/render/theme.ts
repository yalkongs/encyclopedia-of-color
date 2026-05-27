/*
 * Theme tokens accessible from Canvas-rendering code.
 *
 * Keep in sync with src/core/styles/variables.css. We do not read CSS variables
 * via getComputedStyle in hot paths (60fps draw loops) — these constants are the
 * single source of truth for canvas fill/stroke colours.
 */

export const theme = {
  /* Paper */
  paper:        '#fbf6e8',
  paperRecess:  '#efe4cb',
  paperBg:      '#f8f2e4',

  /* Ink */
  ink:          '#1a1a2e',
  inkSoft:      '#2a2a3d',
  inkMute:      '#5a5a6e',
  inkHint:      '#8a8a98',

  /* Accents */
  gold:         '#b8924c',
  goldDeep:     '#8b6a2f',
  crimson:      '#a83232',
  slate:        '#4a5a6b',

  /* Alpha helpers */
  inkAlpha(a: number): string { return `rgba(26, 26, 46, ${a})`; },
  goldAlpha(a: number): string { return `rgba(184, 146, 76, ${a})`; },
  slateAlpha(a: number): string { return `rgba(74, 90, 107, ${a})`; },
  crimsonAlpha(a: number): string { return `rgba(168, 50, 50, ${a})`; },
} as const;

/* Canonical canvas axis style — use for plot frames, grids, baselines. */
export const axisStyle = {
  baseline:  theme.inkAlpha(0.45),
  grid:      theme.inkAlpha(0.10),
  gridMajor: theme.inkAlpha(0.18),
  label:     theme.inkMute,
  caliper:   theme.goldDeep,
} as const;
