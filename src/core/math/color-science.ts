/*
 * Barrel entry point for all color science math.
 * Modules should import from '@core/math/color-science' rather than reaching into
 * individual files. This keeps refactors painless.
 */

export * from './cmf';
export * from './illuminants';
export * from './spectral';
export * from './physics';
export * from './cvd';
