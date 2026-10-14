"use client";

import { Camera, RefreshCw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CameraField({ label, name, optional = false, acceptPdf = true, multiple = false }: { label: string; name: string; optional?: boolean; acceptPdf?: boolean; multiple?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const allowMultiple=multiple||name==="ornamentImage";
  async function prepareFile(selected: File) {
    if (!selected.type.startsWith("image/")) return selected;
    const bitmap = await createImageBitmap(selected);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .78));
    return blob ? new File([blob], selected.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : selected;
  }
  function selectFile(selected: File) {
    const next=allowMultiple?[...files,selected].slice(0,4):[selected];setFiles(next);
    const transfer = new DataTransfer();
    next.forEach(file=>transfer.items.add(file));
    if (input.current) input.current.files = transfer.files;
  }
  const stop = () => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraOpen(false);
  };

  useEffect(() => {
    const preview = video.current;
    const activeStream = stream.current;
    if (!cameraOpen || !preview || !activeStream) return;

    preview.srcObject = activeStream;
    preview.play().catch(() => {
      setCameraError("The camera opened, but the preview could not start. Tap Use camera and allow access again.");
      stop();
    });
  }, [cameraOpen]);

  useEffect(() => () => stream.current?.getTracks().forEach(track => track.stop()), []);

  async function openCamera() {
    setCameraError("");
    if (!window.isSecureContext) {
      setCameraError("Camera access requires HTTPS. Open this page using its secure https:// address.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support camera access. Use file upload instead.");
      return;
    }

    try {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (error) {
        if (!(error instanceof DOMException) || !["OverconstrainedError", "NotFoundError"].includes(error.name)) throw error;
        stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setCameraOpen(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings and try again.");
      } else if (name === "NotReadableError") {
        setCameraError("The camera is already in use by another app or browser tab.");
      } else {
        setCameraError("Camera access is unavailable. Check that a camera is connected, or use file upload instead.");
      }
    }
  }
  function capture() {
    if (!video.current) return;
    const maxSide=1600,scale=Math.min(1,maxSide/Math.max(video.current.videoWidth,video.current.videoHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(video.current.videoWidth*scale); canvas.height = Math.round(video.current.videoHeight*scale);
    canvas.getContext("2d")?.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (!blob) return; selectFile(new File([blob], `${name}-${Date.now()}.jpg`, { type: "image/jpeg" })); stop(); }, "image/jpeg", .78);
  }
  return <div className="camera-field"><div className="camera-label"><strong>{label}{allowMultiple?"s (up to 4)":""}</strong><span>{optional ? "Optional" : "Required when number is entered"}</span></div>
    <input ref={input} name={name} type="file" multiple={allowMultiple} hidden accept={acceptPdf?"image/jpeg,image/png,image/webp,application/pdf":"image/jpeg,image/png,image/webp"} onChange={async e=>{const selected=[...(e.target.files||[])].slice(0,allowMultiple?4:1),prepared=await Promise.all(selected.map(prepareFile)),next=(allowMultiple?[...files,...prepared]:prepared).slice(0,4);setFiles(next);const transfer=new DataTransfer();next.forEach(file=>transfer.items.add(file));if(input.current)input.current.files=transfer.files}}/>
    {(!files.length||allowMultiple&&files.length<4)&&!cameraOpen&&<div className="camera-options"><button type="button" onClick={()=>input.current?.click()}><Upload/> {files.length?"Add files":"Upload file"}</button><button type="button" onClick={openCamera}><Camera/> {files.length?"Add photo":"Use camera"}</button></div>}
    {files.map((file,index)=><div className="selected-file" key={`${file.name}-${index}`}><span><RefreshCw/> {file.name}</span><button type="button" onClick={()=>{const next=files.filter((_,i)=>i!==index);setFiles(next);const transfer=new DataTransfer();next.forEach(item=>transfer.items.add(item));if(input.current)input.current.files=transfer.files}}><X/> Remove</button></div>)}
    {cameraOpen && <div className="camera-preview"><video ref={video} autoPlay playsInline muted/><div className="camera-actions"><button type="button" className="capture-button" onClick={capture}><Camera/> Capture photo</button><button type="button" onClick={stop}>Cancel</button></div></div>}
    {cameraError && <p className="field-error">{cameraError}</p>}
  </div>;
}
