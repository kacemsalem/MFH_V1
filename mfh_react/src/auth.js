const KEY = "mfh_token";
const USER_KEY = "mfh_user";

export const getToken    = () => localStorage.getItem(KEY);
export const getUser     = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
export const getRole     = () => getUser()?.role ?? null;
export const setAuth     = (token, user) => { localStorage.setItem(KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); };
export const clearAuth   = () => { localStorage.removeItem(KEY); localStorage.removeItem(USER_KEY); };

// Patch window.fetch once to inject Authorization header + gérer 401 globalement
const _originalFetch = window.fetch.bind(window);
window.fetch = (url, options = {}) => {
  const token = getToken();
  if (token) {
    options.headers = { Authorization: `Token ${token}`, ...options.headers };
  }
  return _originalFetch(url, options).then(res => {
    if (res.status === 401 && !String(url).includes("/auth/login/")) {
      clearAuth();
      window.location.replace("/");
    }
    return res;
  });
};
