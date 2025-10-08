import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:3000" });

let refreshToken: string | null = null;

export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export function setTokens(access: string | null, refresh: string | null) {
  setAccessToken(access);
  setRefreshToken(refresh);
}

// Response interceptor to handle 401 errors and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      
      try {
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refresh: refreshToken
        });
        
        const { access, refresh } = response.data;
        setTokens(access, refresh);
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        setTokens(null, null);
        throw refreshError;
      }
    }
    
    return Promise.reject(error);
  }
);