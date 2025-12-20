/**
 * Next.js config for mobile (static export for Capacitor)
 * Used with: NODE_ENV=production NEXT_CONFIG=mobile npm run build
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
  // Note: headers() and API routes not supported with 'output: export'
  // API routes are handled by backend API
};

export default nextConfig;
