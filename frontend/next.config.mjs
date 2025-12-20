/**
 * Next.js config for web (server mode for Vercel)
 * For mobile: use next.config.mobile.mjs
 */

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Server mode for Vercel deployment (not static export)
  // Static export is only for mobile APK
  webpack: (config) => {
    config.module.rules.push({
      test: /pdf_viewer\.css$/,
      use: [
        {
          loader: 'null-loader',
        },
      ],
    });

    config.externals.push('canvas');

    return config;
  },
  // Add turbopack config for Next.js 16+
  turbopack: {},
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};

export default nextConfig;
