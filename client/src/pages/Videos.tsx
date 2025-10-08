import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVideos } from "../api";

export default function Videos() {
  const [videos, setVideos] = useState<{ id: string, status: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await getVideos();
      setVideos(res);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []); 

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Uploaded Videos</h2>
        <button onClick={fetchVideos} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {videos.length === 0 ? (
        <div>
            <p>No videos found.</p>
            <button onClick={() => navigate("/")}>Upload</button>
        </div>
      ) : (
        <ul>
          {videos.map((video) => (
            <li
              key={video.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
                borderBottom: "1px solid #ccc",
              }}
            >
              <div>
                <strong>{video.description || "Untitled Video"}</strong> <br />
                Status: {video.status}
              </div>
              {video.status === "READY" && <div>
                <button onClick={() => navigate(`/videos/${video.id}`)}>
                  View
                </button>
              </div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
