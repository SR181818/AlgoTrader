import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: number;
  username: string;
  email: string;
  isPaidUser: boolean;
  binanceApiKey?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Initialize user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch user profile to validate token
  const { isLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        throw new Error('Invalid token');
      }
      
      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    },
    enabled: !!localStorage.getItem('token'),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    queryClient.clear();
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
  };
}