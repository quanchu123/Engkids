const ASSET_ROUTE_PREFIX = '/api/assets/file';

export function staticAssetUrl(publicPath: string): string {
  if (!publicPath) return publicPath;
  if (/^https?:\/\//i.test(publicPath)) return publicPath;
  const clean = publicPath.replace(/^\/+/, '');
  return `${ASSET_ROUTE_PREFIX}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}
