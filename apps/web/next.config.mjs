/** Cloudflare Pages static deployment: all application API calls are browser-side. */
const nextConfig={
  output:'export',
  trailingSlash:true,
  images:{unoptimized:true},
};
export default nextConfig;
