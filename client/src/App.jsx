import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VideoUploader from "./pages/VideoUploader";
import VideoPlayer from "./pages/VideoPlayer";
import Videos from "./pages/Videos";

function PrivateRoute({ element }) {
  const token = localStorage.getItem("token");
  return token ? element : <Navigate to="/login" replace />;
}

export default function App() {
  console.log("here")
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"element={<PrivateRoute element={<VideoUploader />}  />} />
      <Route path="/videos/:id" element={<PrivateRoute element={<VideoPlayer />}  />} />
      <Route path="/videos" element={<PrivateRoute element={<Videos />}  />} />
    </Routes>
  );
}
