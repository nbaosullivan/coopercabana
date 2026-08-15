'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PublicAttendee } from '@/lib/types';
import LoginModal from './LoginModal';

interface UserContextValue {
  user: PublicAttendee | null;
  setUser: (u: PublicAttendee | null) => void;
  attendees: PublicAttendee[];
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}

export default function UserProvider({
  initialUser,
  attendees,
  children,
}: {
  initialUser: PublicAttendee | null;
  attendees: PublicAttendee[];
  children: ReactNode;
}) {
  const [user, setUser] = useState<PublicAttendee | null>(initialUser);

  return (
    <UserContext.Provider value={{ user, setUser, attendees }}>
      {user ? children : <LoginModal attendees={attendees} onSuccess={setUser} />}
    </UserContext.Provider>
  );
}
