/**
 * Next.js config for mobile (static export for Capacitor)
 * Used with: npm run build:mobile
 */

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  distDir: 'out',
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
  // Note: headers() and API routes not supported with 'output: export'
  // API routes are handled by backend API
};

export default nextConfig;
