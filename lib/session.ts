import { cookies } from 'next/headers';

const COOKIE_NAME = 'stag_user_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function setSessionCookie(attendeeId: string) {
  cookies().set(COOKIE_NAME, attendeeId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getSessionAttendeeId(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}
