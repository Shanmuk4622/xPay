import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AppRole = 'super_admin' | 'admin' | 'user' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren<{}>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Fetch role from the public.users table
    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (mounted) {
          if (error) {
            console.error('Error fetching user role:', error);
            // Default to 'user' restricted access on error
            setRole('user');
          } else if (data) {
            setRole(data.role as AppRole);
          } else {
            console.warn('User authenticated but not found in public.users');
            // Default to 'user' restricted access if record missing
            setRole('user');
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching role:', err);
        if (mounted) setRole('user');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // 1. Check active session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserRole(session.user.id);
          } else {
            setRole(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Session check failed', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Reset loading to true while we fetch the new role
          setLoading(true);
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setSession(null);
    setUser(null);
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