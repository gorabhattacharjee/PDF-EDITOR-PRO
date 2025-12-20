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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *"
          }
        ]
      }
    ]
  }
};

export default nextConfig;
