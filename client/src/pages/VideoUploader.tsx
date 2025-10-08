import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { crc32 } from "crc";
import { Buffer } from "buffer";
import { completeUpload, generatePresignUrl, getUploadedParts, initiateLargeUpload } from "../api";

let PART_SIZE = 8 * 1024 * 1024; // 8MB
const CONCURRENCY = 4;

window.Buffer = Buffer

type UploadState = {
  uploadId: string;
  s3Key: string;
  parts: Record<number, string>; // partNumber -> ETag
};

function saveState(key: string, state: UploadState) {
    localStorage.setItem(key, JSON.stringify(state));
  }

function loadState(key: string): UploadState | null {
  const s = localStorage.getItem(key);
  return s ? JSON.parse(s) : null;
}

async function computeCheckSum(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const crcValue = crc32(Buffer.from(arrayBuffer)) >>> 0; // unsigned
  const checksum = btoa(
    String.fromCharCode(
      (crcValue >> 24) & 0xff,
      (crcValue >> 16) & 0xff,
      (crcValue >> 8) & 0xff,
      crcValue & 0xff
    )
  );
  console.log(checksum)
  return checksum
}

export default function VideoUploader() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);

  async function startUpload(f: File) {
    setStatus("init");
    const metaKey = `upload:${f.name}:${f.size}`;
    let state = loadState(metaKey);

    if (!state) {
      // init
      const init = await initiateLargeUpload(f.name, f.type, f.size, description);
      state = { uploadId: init.upload_id, s3Key: init.s3_key, parts: {} };
      PART_SIZE = init.part_size_bytes
      saveState(metaKey, state);
    }

    // compute parts
    const totalParts = Math.ceil(f.size / PART_SIZE);
    // ask server for already uploaded parts
    const res = await getUploadedParts(state.s3Key, state.uploadId);
    const uploadedPartsFromS3: Record<number, string> = {};
    (res || []).forEach((p) => { uploadedPartsFromS3[p.PartNumber] = p.ETag; });

    // create queue of missing parts
    const partsToUpload: number[] = [];
    for (let i = 1; i <= totalParts; i++) {
      if (!uploadedPartsFromS3[i] && !state.parts[i]) partsToUpload.push(i);
      else {
        // preserve ETag if we have it locally or from S3
        state.parts[i] = state.parts[i] || uploadedPartsFromS3[i];
      }
    }
    saveState(metaKey, state);
    setStatus("uploading");

    // concurrency-controlled uploader
    let active = 0;
    let idx = 0;
    let uploaded = Object.keys(state.parts).length;
    controllerRef.current = new AbortController();

    await new Promise<void>((resolve, reject) => {
      const next = async () => {
        if (controllerRef.current?.signal.aborted) return reject(new Error("aborted"));
        if (idx >= partsToUpload.length && active === 0) return resolve();
        while (active < CONCURRENCY && idx < partsToUpload.length) {
          const partNumber = partsToUpload[idx++];
          active++;
          (async () => {
            try {
              const start = (partNumber - 1) * PART_SIZE;
              const end = Math.min(f.size, start + PART_SIZE);
              const blob = f.slice(start, end);
              const checksum = await computeCheckSum(blob)
              const url = await generatePresignUrl(state!.s3Key, state!.uploadId, partNumber, checksum);
              // upload using fetch so we can get ETag header
              const putRes = await fetch(url, { method: "PUT", body: blob, headers: {
                'x-amz-checksum-crc32': checksum,
                
              } });
              if (!putRes.ok) throw new Error("part upload failed");
              const etag = putRes.headers.get("ETag");
              if (!etag) throw new Error("no etag");
              state!.parts[partNumber] = etag;
              uploaded++;
              setProgress(Math.round((uploaded / totalParts) * 100));
              saveState(metaKey, state!);
            } catch (err) {
              console.error("part upload err", err);
              reject(err);
            } finally {
              active--;
              next();
            }
          })();
        }
      };
      next();
    });

    // all parts uploaded, call complete
    setStatus("completing");
    // build parts array sorted
    const partsArr = Object.entries(state.parts).map(([pn, etag]) => ({ part_number: parseInt(pn, 10), etag: etag }));
    partsArr.sort((a,b)=>a.part_number-b.part_number);
    await completeUpload(state.s3Key, state.uploadId, f.name, f.type, f.size, partsArr);
    localStorage.removeItem(metaKey);
    setStatus("processing");
    navigate('/videos')
  }

  return (
    <div>
      <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input type="file" accept="video/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <button onClick={()=>file && startUpload(file)}>Upload</button>
      <button onClick={()=>{ controllerRef.current?.abort(); setStatus("paused"); }}>Pause</button>
      <div>Progress: {progress}%</div>
      <div>Status: {status}</div>
    </div>
  );
}
