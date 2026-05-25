// Auth helper function for -> auth fetch

/**
 * @param {string} endpoint - e.g. "/api/auth/login"
 * @param {object} options  - fetch options (method, body, etc.)
 */

async function authFetch(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong. Please try again.");
  }

  return data;
}

// Log in with email and password.
export async function login(email, password) {
  return authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Create a new account
export async function register(name, email, password) {
  return authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// Log out the current user
export async function logout() {
  return authFetch("/api/auth/logout", { method: "POST" });
}

// Fetch the currently logged-in user's profile
export async function getMe() {
  return authFetch("/api/auth/me");
}