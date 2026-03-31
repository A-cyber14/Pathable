import axios from "axios";
import { auth } from "../firebase";

<<<<<<< HEAD

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
=======
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
>>>>>>> e143b9eae0b4361f2e402a47f65892b00c5518ec

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

<<<<<<< HEAD
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

=======
export async function getBusinesses()          { return api.get("/api/businesses"); }
export async function getBusiness(id)          { return api.get(`/api/businesses/${id}`); }
export async function searchBusinesses(query)  { return query?.trim() ? api.get(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`) : getBusinesses(); }
export async function submitReview(data)       { return api.post("/api/reviews", data); }
export async function getBookmarks()           { return api.get("/api/users/me/bookmarks"); }
export async function addBookmark(id)          { return api.post(`/api/businesses/${id}/bookmark`); }
export async function removeBookmark(id)       { return api.delete(`/api/businesses/${id}/bookmark`); }
export async function getProfile()             { return api.get("/api/users/me/profile"); }
export async function updateProfile(data)      { return api.put("/api/users/me/profile", data); }
export async function submitPhoto(id, data)    { return api.post(`/api/businesses/${id}/photos`, data); }
export async function submitFeatures(id, data) { return api.post(`/api/businesses/${id}/features`, data); }
>>>>>>> e143b9eae0b4361f2e402a47f65892b00c5518ec
