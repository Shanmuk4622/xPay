import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppRole = 'super_admin' | 'admin' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren<{}>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Role fetch error:', error);
        return 'user';
      }
      return (data?.role as AppRole) || 'user';
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
      return 'user';
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user) {
          const userRole = await fetchUserRole(initialSession.user.id);
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
            setRole(userRole);
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (currentSession?.user) {
        // If we already have this user and role, don't trigger a full reload
        if (user?.id === currentSession.user.id && role) {
          setSession(currentSession);
          setUser(currentSession.user);
          return;
        }

        setLoading(true);
        const userRole = await fetchUserRole(currentSession.user.id);
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession.user);
          setRole(userRole);
          setLoading(false);
        }
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user?.id, role]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setRole(null);
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};