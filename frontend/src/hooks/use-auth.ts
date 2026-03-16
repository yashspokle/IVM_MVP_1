import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('grocero_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('grocero_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('grocero_user');
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    // Simulate sign in
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser({ id: Date.now().toString(), email });
        setLoading(false);
        resolve();
      }, 500);
    });
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    // Simulate sign up
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setUser({ id: Date.now().toString(), email });
        setLoading(false);
        resolve();
      }, 500);
    });
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('grocero_user');
    localStorage.removeItem('grocero_inventory');
  };

  const isAuthenticated = user !== null;

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
  };
}