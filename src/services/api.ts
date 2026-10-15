import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeWorkspaceId = localStorage.getItem('active_workspace_id');
  if (activeWorkspaceId) {
    config.headers['x-workspace-id'] = activeWorkspaceId;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Session expired
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
