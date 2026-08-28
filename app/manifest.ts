import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Coopercabana — Málaga Stag',
    short_name: 'Coopercabana',
    description: 'Málaga, 1–4 Sept — everything for the weekend, in one place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f2f0e6',
    theme_color: '#f2f0e6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
