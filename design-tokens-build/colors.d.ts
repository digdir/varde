/* This file is deprecated and will be removed in a future release. Use types.d.ts instead */
/* build: v0.0.0-feat-remove-color-categories-20260616084032 */
import type {} from '@digdir/designsystemet-types';

// Augment types based on theme
declare module '@digdir/designsystemet-types' {
  export interface ColorDefinitions {
    accent: never;
    brand1: never;
    brand2: never;
    brand3: never;
    neutral: never;
  }
  export interface SeverityColorDefinitions {
    info: never;
    success: never;
    warning: never;
    danger: never;
  }
}
