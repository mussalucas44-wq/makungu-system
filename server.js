// users.js – frontend code
const API_URL = "https://makungu-backend-v2.onrender.com/api"; // your backend URL

// Login
async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return await res.json();
}

// Get all users (admin only)
async function getUsers(adminEmail) {
  const res = await fetch(`${API_URL}/users?adminEmail=${adminEmail}`);
  return await res.json();
}

// Add new user (admin only)
async function addUser(adminEmail, username, email, password, role) {
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminEmail, username, email, password, role })
  });
  return await res.json();
}

// Delete user (admin only)
async function deleteUser(adminEmail, email) {
  const res = await fetch(`${API_URL}/users/${email}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminEmail })
  });
  return await res.json();
}

// Request password reset
async function requestReset(email) {
  const res = await fetch(`${API_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return await res.json();
}

// Reset password
async function resetPassword(email, code, newPassword) {
  const res = await fetch(`${API_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword })
  });
  return await res.json();
}
