function pickClosestLinkByTargetCenter(links, targetCenterY) {
  if (!Array.isArray(links) || links.length === 0 || Number.isNaN(Number(targetCenterY))) {
    return null;
  }

  return links.reduce((best, current) => {
    const bestCenter = (best.pts.ty1 + best.pts.ty2) / 2;
    const currentCenter = (current.pts.ty1 + current.pts.ty2) / 2;
    const bestDistance = Math.abs(bestCenter - targetCenterY);
    const currentDistance = Math.abs(currentCenter - targetCenterY);
    return currentDistance < bestDistance ? current : best;
  });
}

export default pickClosestLinkByTargetCenter;
