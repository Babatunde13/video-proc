import React, { useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import Hls from "hls.js"

export default function VideoPlayer() {
    const baseUrl = "http://localhost:3000" // use from env
    const { id } = useParams<{ id: string }>();
    const manifestUrl = `${baseUrl}/api/v1/play/${id}/manifest`;
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
    if (!id || !videoRef.current) return;
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(manifestUrl);
        hls.attachMedia(videoRef.current!);

        return () => {
        hls.destroy()
        }
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        // Fallback for Safari
        videoRef.current.src = manifestUrl;
    }
    }, [id]);

    return <video ref={videoRef} controls />;
}
