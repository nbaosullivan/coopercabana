import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getCurrentUser, getAttendeeList, getFinancesForUser } from '@/app/actions';
import UserProvider from '@/components/UserProvider';
import CurrencyProvider from '@/components/CurrencyProvider';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ScrollToTop from '@/components/ScrollToTop';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Coopercabana',
  description: 'Málaga, 1–4 Sept - everything for the stag do, in one place.',
  icons: {
    icon: '/coopercabana.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coopercabana',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f2f0e6',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, attendees] = await Promise.all([getCurrentUser(), getAttendeeList()]);
  const finances = user ? await getFinancesForUser(user.id) : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <UserProvider initialUser={user} attendees={attendees}>
          <CurrencyProvider>
            <Header totalOutstanding={finances?.totalOutstanding ?? 0} />
            <main className="mx-auto max-w-lg px-4 pb-28 pt-4">{children}</main>
            <BottomNav />
            <ScrollToTop />
            <ServiceWorkerRegister />
          </CurrencyProvider>
        </UserProvider>
      </body>
    </html>
  );
}
