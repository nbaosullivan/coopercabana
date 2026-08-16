import { redirect } from 'next/navigation';
import { getDefaultLandingPage } from './actions';

// The landing tab is config-driven: the `settings` table in Supabase holds
// `default_landing_page` ('schedule' | 'money' | 'flights' | 'tasks'). Change
// it there — no code deploy needed. Falls back to the code default if the
// row is missing or invalid.
export default async function RootPage() {
  const landing = await getDefaultLandingPage();
  redirect(`/${landing}`);
}
