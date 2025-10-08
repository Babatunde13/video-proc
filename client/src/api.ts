import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1", // proxied to backend
});

export async function signup(name: string, email: string, password: string) {
  return api.post("/auth/register", { email, password, name });
}

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", res.data.data.auth.token);
}

export async function getPresignedUrl(s3Key: string) {
  const token = localStorage.getItem("token");
  const res = await api.get(`/uploads/${s3Key}/presign`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data.url;
}

export async function initiateLargeUpload(filename: string, contentType: string, sizeBytes: number, description?: string) {
  const token = localStorage.getItem("token");
  const res = await api.post(`/uploads/initiate`,{ filename, content_type: contentType, size_bytes: sizeBytes, description }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as { upload_id: string; s3_key: string, part_size_bytes: number };
}

export async function getUploadedParts(s3Key: string, uploadId: string) {
  const token = localStorage.getItem("token");
  const res = await api.get(`/uploads/${encodeURIComponent(s3Key)}/parts?upload_id=${uploadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as { PartNumber: number; ETag: string }[];
}

export async function generatePresignUrl(s3Key: string, uploadId: string, partNumber: number, checksum: string): Promise<string> {
  const token = localStorage.getItem("token");
  const res = await api.post(`/uploads/${encodeURIComponent(s3Key)}/presign`, { upload_id: uploadId, part_number: partNumber, checksum }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data.url;
}

export async function completeUpload(s3Key: string, uploadId: string, filename: string, contentType: string, sizeBytes: number, parts: { part_number: number; etag: string }[]): Promise<string> {
  const token = localStorage.getItem("token");
  const res = await api.post(`/uploads/${encodeURIComponent(s3Key)}/complete`, { upload_id: uploadId, parts, filename, content_type: contentType, size_bytes: sizeBytes }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

export async function getVideos(status?: string) {
  const token = localStorage.getItem("token");
  const url = status ? `/videos?status=${status}` : '/videos'
  const res = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}
