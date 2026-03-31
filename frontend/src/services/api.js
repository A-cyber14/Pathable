// ---------------------------------------------------------------------------
// Pathable API helper
// All requests go through FastAPI — never directly to Firebase.
// Base URL is set via VITE_API_BASE_URL in .env (defaults to localhost:8000)
// Firebase auth token is automatically attached to every request when a
// user is signed in, via an Axios request interceptor.
// ---------------------------------------------------------------------------

import axios from "axios";
import { auth } from "../firebase";   // FIX: was "../firebase" — path must match actual file location

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Firebase auth token if user is signed in
// If no user is logged in, the request goes out without an Authorization header.
// ---------------------------------------------------------------------------

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// ---------------------------------------------------------------------------
// Response interceptor — normalize FastAPI error shape { detail: "..." }
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      "Request failed";
    return Promise.reject(new Error(message));
  }
);

export async function getBusinesses() {
  return api.get("/api/businesses");
}

export async function getBusiness(id) {
  if (!id) throw new Error("getBusiness requires an id");
  return api.get(`/api/businesses/${id}`);
}

export async function submitReview(reviewData) {
  if (!reviewData?.business_id) throw new Error("submitReview requires a business_id");
  return api.post("/api/reviews", reviewData);
}

export async function searchBusinesses(query) {
  if (!query?.trim()) return getBusinesses();
  return api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`);
}

export async function getBookmarks() {
  return api.get("/api/users/me/bookmarks");
}

export async function addBookmark(businessId) {
  return api.post(`/api/businesses/${businessId}/bookmark`);
}

export async function removeBookmark(businessId) {
  return api.delete(`/api/businesses/${businessId}/bookmark`);
}

export async function getProfile() {
  return api.get("/api/users/me/profile");
}

export async function updateProfile(data) {
  return api.put("/api/users/me/profile", data);
}

export async function submitPhoto(businessId, data) {
  return api.post(`/api/businesses/${businessId}/photos`, data);
}

export async function submitFeatures(businessId, data) {
  return api.post(`/api/businesses/${businessId}/features`, data);
}
