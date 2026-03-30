// ---------------------------------------------------------------------------
// Pathable API helper
// All requests go through FastAPI — never directly to Firebase.
// Base URL is set via VITE_API_BASE_URL in .env (defaults to localhost:8000)
// Firebase auth token is automatically attached to every request when a
// user is signed in, via an Axios request interceptor.
// ---------------------------------------------------------------------------

import axios from "axios";
import { auth } from "../firebase";

const BASE_URL = "https://pathable-production.up.railway.app" || "http://localhost:8000";

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

// ---------------------------------------------------------------------------
// getBusinesses()
// Fetches all businesses from GET /api/businesses
// Returns: BusinessSummary[]
// ---------------------------------------------------------------------------

export async function getBusinesses() {
  return api.get("/api/businesses");
}

// ---------------------------------------------------------------------------
// getBusiness(id)
// Fetches full detail for a single business from GET /api/businesses/:id
// Returns: Business
// ---------------------------------------------------------------------------

export async function getBusiness(id) {
  if (!id) throw new Error("getBusiness requires an id");
  return api.get(`/api/businesses/${id}`);
}

// ---------------------------------------------------------------------------
// submitReview(reviewData)
// Posts a review to POST /api/reviews
// reviewData: {
//   business_id           string  (required)
//   wheelchair_accessible bool
//   accessible_parking    bool
//   entrance_width_rating string  "narrow" | "standard" | "wide"
//   comment               string  (optional)
// }
// Returns: { message, business_id }
// ---------------------------------------------------------------------------

export async function submitReview(reviewData) {
  if (!reviewData?.business_id) throw new Error("submitReview requires a business_id");
  return api.post("/api/reviews", reviewData);
}

// ---------------------------------------------------------------------------
// searchBusinesses(query)
// Searches businesses by name via GET /api/businesses/search?q=
// Returns: BusinessSummary[]
// ---------------------------------------------------------------------------

export async function searchBusinesses(query) {
  if (!query?.trim()) return getBusinesses();
  return api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`);
}

// ---------------------------------------------------------------------------
// getBookmarks()
// Fetches the current user's bookmarked businesses
// GET /api/users/me/bookmarks
// Returns: Business[]
// ---------------------------------------------------------------------------

export async function getBookmarks() {
  return api.get("/api/users/me/bookmarks");
}

// ---------------------------------------------------------------------------
// addBookmark(businessId)
// Adds a business to the current user's bookmarks
// POST /api/businesses/:id/bookmark
// ---------------------------------------------------------------------------

export async function addBookmark(businessId) {
  return api.post(`/api/businesses/${businessId}/bookmark`);
}

// ---------------------------------------------------------------------------
// removeBookmark(businessId)
// Removes a business from the current user's bookmarks
// DELETE /api/businesses/:id/bookmark
// ---------------------------------------------------------------------------

export async function removeBookmark(businessId) {
  return api.delete(`/api/businesses/${businessId}/bookmark`);
}

// ---------------------------------------------------------------------------
// getProfile()
// Fetches the current user's disability type + feature preferences
// GET /api/users/me/profile
// ---------------------------------------------------------------------------

export async function getProfile() {
  return api.get("/api/users/me/profile");
}

// ---------------------------------------------------------------------------
// updateProfile(data)
// Saves disability type + feature preferences
// PUT /api/users/me/profile
// data: { disabilityType: string, featurePreferences: string[] }
// ---------------------------------------------------------------------------

export async function updateProfile(data) {
  return api.put("/api/users/me/profile", data);
}

// ---------------------------------------------------------------------------
// submitPhoto(businessId, data)
// POST /api/businesses/:id/photos
// data: { photoUrl, caption }
// ---------------------------------------------------------------------------

export async function submitPhoto(businessId, data) {
  return api.post(`/api/businesses/${businessId}/photos`, data);
}

// ---------------------------------------------------------------------------
// submitFeatures(businessId, data)
// POST /api/businesses/:id/features
// data: { wheelchairAccessible, accessibleParking, doorWidth, accessibleRestroom, notes }
// ---------------------------------------------------------------------------

export async function submitFeatures(businessId, data) {
  return api.post(`/api/businesses/${businessId}/features`, data);
}

