/** Only a bootstrap resolution cap; quality tiers/auto downgrade belong to HYA-003. */
export function viewportSize(width: number, height: number, dpr: number) {
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
    pixelRatio: Math.min(1.5, Math.max(0.75, dpr)),
  };
}
