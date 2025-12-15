import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    // #region agent log
    if(config.url && config.url.includes('brands/export')){fetch('http://127.0.0.1:7242/ingest/6aef7949-77a2-46a4-8fc4-df76651a5e4e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:13',message:'Request interceptor - final URL',data:{url:config.url,baseURL:config.baseURL,method:config.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});}
    // #endregion
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors (logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page to prevent redirect loops
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        // Clear storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

