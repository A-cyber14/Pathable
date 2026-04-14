// ---------------------------------------------------------------------------
// Pathable API helper
// All requests go through FastAPI — never directly to Firebase.
// Base URL is set via VITE_API_BASE_URL in .env (defaults to localhost:8000)
// Firebase auth token is automatically attached to every request when a
// user is signed in, via an Axios request interceptor.
// ---------------------------------------------------------------------------

import axios from "axios";
import { auth } from "../firebase";

const _rawUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const BASE_URL = _rawUrl.startsWith("http://") && !_rawUrl.includes("localhost")
  ? _rawUrl.replace("http://", "https://")
  : _rawUrl;

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

export async function getBusinesses()          { return api.get("/api/businesses"); }
export async function getTopRated()            { return api.get("/api/businesses/top-rated"); }
export async function getBusiness(id)          { return api.get(`/api/businesses/${id}`); }
export async function getBusinessPhotos(id)    { return api.get(`/api/businesses/${id}/photos`); }
export async function getBusinessReviews(id)    { return api.get(`/api/businesses/${id}/reviews`); }
export async function getReviewSummary(id)      { return api.get(`/api/businesses/${id}/review-summary`); }
export async function searchBusinesses(query)  { return query?.trim() ? api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`) : getBusinesses(); }
export async function searchUnified(query)     { return query?.trim() ? api.get(`/api/businesses/search-unified?q=${encodeURIComponent(query.trim())}`) : []; }
export async function submitReview(data)       { return api.post("/api/reviews", data); }
export async function getBookmarks()           { return api.get("/api/users/me/bookmarks"); }
export async function addBookmark(id)          { return api.post(`/api/businesses/${id}/bookmark`); }
export async function removeBookmark(id)       { return api.delete(`/api/businesses/${id}/bookmark`); }
export async function getProfile()             { return api.get("/api/users/me/profile"); }
export async function updateProfile(data)      { return api.put("/api/users/me/profile", data); }
export async function submitPhoto(id, data)         { return api.post(`/api/businesses/${id}/photos`, data); }
export async function submitFeatures(id, data)      { return api.post(`/api/businesses/${id}/features`, data); }
export async function submitIssueReport(id, data)   { return api.post(`/api/businesses/${id}/issue-reports`, data); }
export async function getPendingIssueReports(id)    { return api.get(`/api/businesses/${id}/issue-reports/pending`); }
export async function createFromExternal(data)      { return api.post("/api/businesses/create-from-external", data); }

// ---------------------------------------------------------------------------
// Onboarding — account type + business setup
// ---------------------------------------------------------------------------
export async function setupBusiness(data)          { return api.post("/api/users/me/setup-business", data); }

// ---------------------------------------------------------------------------
// Business Dashboard — business-owner-only endpoints
// ---------------------------------------------------------------------------
export async function getDashboardBusiness()           { return api.get("/api/dashboard/my-business"); }
export async function updateDashboardBusiness(data)    { return api.put("/api/dashboard/my-business", data); }
export async function getDashboardReviews()            { return api.get("/api/dashboard/my-business/reviews"); }
export async function getDashboardAnalytics()          { return api.get("/api/dashboard/my-business/analytics"); }
export async function respondToReview(id, data)        { return api.post(`/api/reviews/${id}/response`, data); }

// ---------------------------------------------------------------------------
// Admin — admin-only endpoints
// ---------------------------------------------------------------------------
export async function getAdminStats()                              { return api.get("/api/admin/stats"); }
export async function getAdminBusinesses()                         { return api.get("/api/admin/businesses"); }
export async function updateAdminBusiness(id, data)                { return api.patch(`/api/admin/businesses/${id}`, data); }
export async function deleteAdminBusiness(id)                      { return api.delete(`/api/admin/businesses/${id}`); }
export async function getAdminUsers()                              { return api.get("/api/admin/users"); }
export async function deleteAdminUser(uid)                         { return api.delete(`/api/admin/users/${uid}`); }
export async function unlinkBusinessUser(uid)                      { return api.patch(`/api/admin/users/${uid}/unlink-business`); }
export async function getAdminReviews()                            { return api.get("/api/admin/reviews"); }
export async function deleteAdminReview(id)                        { return api.delete(`/api/admin/reviews/${id}`); }
export async function getAdminMedia()                              { return api.get("/api/admin/media"); }
export async function deleteAdminMedia(bizId, photoId)             { return api.delete(`/api/admin/media/${bizId}/${photoId}`); }
export async function cleanupOrphanedPhotos()                      { return api.post("/api/admin/cleanup-orphaned-photos"); }
