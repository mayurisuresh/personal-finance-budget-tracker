import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from './ThemeContext';

export interface User {
  _id: string;
  name: string;
  email: string;
  financialProfile: string;
  financialPriorities: string[];
  currency: string;
  activeWorkspaceId?: string;
  preferences?: {
    theme?: string;
    accentColor?: string;
    currency?: string;
    defaultDateRange?: string;
    visibleCards?: string[];
    alertThresholds?: { warn: number; danger: number };
  };
}

export interface Workspace {
  _id: string;
  name: string;
  type: 'personal' | 'business' | 'family';
  ownerId: string;
  currency: string;
  members: Array<{
    userId?: string;
    email: string;
    role: string;
    status: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  updatePreferences: (prefs: any) => Promise<boolean>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { setTheme, setCurrency, setAccentColor } = useTheme();

  const applyUserPreferences = (u: User) => {
    if (u.preferences?.theme) {
      setTheme(u.preferences.theme as any);
    }
    if (u.preferences?.currency || u.currency) {
      setCurrency((u.preferences?.currency || u.currency) as any);
    }
    if (u.preferences?.accentColor) {
      setAccentColor(u.preferences.accentColor);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setWorkspaces(res.data.workspaces || []);
        setActiveWorkspace(res.data.activeWorkspace || null);
        if (res.data.activeWorkspace) {
          localStorage.setItem('active_workspace_id', res.data.activeWorkspace._id);
        }
        applyUserPreferences(res.data.user);
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('active_workspace_id');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const receivedToken = res.data.token;
        setToken(receivedToken);
        localStorage.setItem('auth_token', receivedToken);
        setUser(res.data.user);
        if (res.data.workspace) {
          setActiveWorkspace(res.data.workspace);
          localStorage.setItem('active_workspace_id', res.data.workspace._id);
        }
        applyUserPreferences(res.data.user);
        await refreshUser();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: any): Promise<boolean> => {
    try {
      const res = await api.post('/auth/register', data);
      if (res.data.success) {
        const receivedToken = res.data.token;
        setToken(receivedToken);
        localStorage.setItem('auth_token', receivedToken);
        setUser(res.data.user);
        if (res.data.workspace) {
          setActiveWorkspace(res.data.workspace);
          localStorage.setItem('active_workspace_id', res.data.workspace._id);
        }
        applyUserPreferences(res.data.user);
        await refreshUser();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      setWorkspaces([]);
      setActiveWorkspace(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('active_workspace_id');
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const res = await api.patch('/auth/profile', data);
      if (res.data.success) {
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const updatePreferences = async (prefs: any): Promise<boolean> => {
    try {
      const res = await api.patch('/auth/preferences', prefs);
      if (res.data.success) {
        setUser(res.data.user);
        applyUserPreferences(res.data.user);
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update preferences');
    }
  };

  const switchWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      const res = await api.post('/workspaces/switch', { workspaceId });
      if (res.data.success) {
        localStorage.setItem('active_workspace_id', workspaceId);
        setActiveWorkspace(res.data.workspace);
        await refreshUser();
      }
    } catch (err: any) {
      console.error('Failed to switch workspace', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        updatePreferences,
        switchWorkspace,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
