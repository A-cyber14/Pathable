// ---------------------------------------------------------------------------
// Pathable API helper
// All requests go through FastAPI — never directly to Firebase.
// Base URL is set via VITE_API_BASE_URL in .env (defaults to localhost:8000)
// Firebase auth token is automatically attached to every request when a
// user is signed in, via an Axios request interceptor.
// ---------------------------------------------------------------------------

import axios from "axios";
import { auth } from "../firebase";

const BASE_URL =  "http://localhost:8000";

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

<<<<<<< HEAD
// ---------------------------------------------------------------------------
// getBusinesses()
// ---------------------------------------------------------------------------
export async function getBusinesses() {
  return api.get("/api/businesses");
}

// ---------------------------------------------------------------------------
// getBusiness(id)
// ---------------------------------------------------------------------------
export async function getBusiness(id) {
  if (!id) throw new Error("getBusiness requires an id");
  return api.get(`/api/businesses/${id}`);
}

// ---------------------------------------------------------------------------
// getBusinessPhotos(businessId)
// Fetches approved photo contributions for a business, grouped for display.
// Returns: PhotoContribution[]  (newest first)
// Each item: { id, businessId, userId, category, photoUrl, caption, createdAt }
// ---------------------------------------------------------------------------
export async function getBusinessPhotos(businessId) {
  if (!businessId) throw new Error("getBusinessPhotos requires a businessId");
  return api.get(`/api/businesses/${businessId}/photos`);
}

// ---------------------------------------------------------------------------
// submitReview(reviewData)
// ---------------------------------------------------------------------------
export async function submitReview(reviewData) {
  if (!reviewData?.business_id) throw new Error("submitReview requires a business_id");
  return api.post("/api/reviews", reviewData);
}

// ---------------------------------------------------------------------------
// searchBusinesses(query)
// ---------------------------------------------------------------------------
export async function searchBusinesses(query) {
  if (!query?.trim()) return getBusinesses();
  return api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`);
}

// ---------------------------------------------------------------------------
// getBookmarks()
// ---------------------------------------------------------------------------
export async function getBookmarks() {
  return api.get("/api/users/me/bookmarks");
}

// ---------------------------------------------------------------------------
// addBookmark(businessId)
// ---------------------------------------------------------------------------
export async function addBookmark(businessId) {
  return api.post(`/api/businesses/${businessId}/bookmark`);
}

// ---------------------------------------------------------------------------
// removeBookmark(businessId)
// ---------------------------------------------------------------------------
export async function removeBookmark(businessId) {
  return api.delete(`/api/businesses/${businessId}/bookmark`);
}

// ---------------------------------------------------------------------------
// getProfile()
// ---------------------------------------------------------------------------
export async function getProfile() {
  return api.get("/api/users/me/profile");
}

// ---------------------------------------------------------------------------
// updateProfile(data)
// ---------------------------------------------------------------------------
export async function updateProfile(data) {
  return api.put("/api/users/me/profile", data);
}

// ---------------------------------------------------------------------------
// submitPhoto(businessId, data)
// POST /api/businesses/:id/photos
// data: { photoUrl, caption, category }
// ---------------------------------------------------------------------------
export async function submitPhoto(businessId, data) {
  return api.post(`/api/businesses/${businessId}/photos`, data);
}

// ---------------------------------------------------------------------------
// submitFeatures(businessId, data)
// POST /api/businesses/:id/features
// ---------------------------------------------------------------------------
export async function submitFeatures(businessId, data) {
  return api.post(`/api/businesses/${businessId}/features`, data);
}
=======
export async function getBusinesses()          { return api.get("/api/businesses"); }
export async function getTopRated()            { return api.get("/api/businesses/top-rated"); }
export async function getBusiness(id)          { return api.get(`/api/businesses/${id}`); }
export async function getBusinessPhotos(id)    { return api.get(`/api/businesses/${id}/photos`); }
export async function searchBusinesses(query)  { return query?.trim() ? api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`) : getBusinesses(); }
export async function searchUnified(query)     { return query?.trim() ? api.get(`/api/businesses/search-unified?q=${encodeURIComponent(query.trim())}`) : []; }
export async function submitReview(data)       { return api.post("/api/reviews", data); }
export async function getBookmarks()           { return api.get("/api/users/me/bookmarks"); }
export async function addBookmark(id)          { return api.post(`/api/businesses/${id}/bookmark`); }
export async function removeBookmark(id)       { return api.delete(`/api/businesses/${id}/bookmark`); }
export async function getProfile()             { return api.get("/api/users/me/profile"); }
export async function updateProfile(data)      { return api.put("/api/users/me/profile", data); }
export async function submitPhoto(id, data)    { return api.post(`/api/businesses/${id}/photos`, data); }
export async function submitFeatures(id, data) { return api.post(`/api/businesses/${id}/features`, data); }
>>>>>>> a21d7748e3409b7e9a81c0a76b067f34c9aba08d
