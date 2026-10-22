"use client";

import { BellRing, Camera, Download, FileText, FileUp, MessageCircle, Mic, Paperclip, Search, Send, Square, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatScope } from "@/lib/chat";

type ChatActor = { id:number;username:string;displayName:string;roleLabel:string };
type ChatUser = ChatActor & { actorType:string;unreadCount:number;lastMessageAt:string|null };
type ChatMessage = { id:number;senderUserId:number;recipientUserId:number;body:string|null;attachmentName:string|null;attachmentMime:string|null;attachmentSize:number|null;attachmentUrl:string|null;createdAt:string;readAt:string|null };
type ChatPayload = { actor:ChatActor;directory:ChatUser[];messages:ChatMessage[];latestUnread:{id:number;senderId:number;senderName:string;senderUsername:string}|null;error?:string };

const acceptTypes = ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.txt,.csv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.odt,.ods,.webm,.ogg,.mp3,.m4a,.wav";
const initials = (name:string) => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("") || "U";
const fileSize = (bytes:number|null) => !bytes ? "" : bytes < 1024 * 1024 ? `${Math.ceil(bytes/1024)} KB` : `${(bytes/(1024*1024)).toFixed(1)} MB`;
const time = (value:string) => new Date(value).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

export default function ChatDock({ scope }:{ scope:ChatScope }) {
  const [open,setOpen]=useState(false),[actor,setActor]=useState<ChatActor|null>(null),[directory,setDirectory]=useState<ChatUser[]>([]),[messages,setMessages]=useState<ChatMessage[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null),[search,setSearch]=useState(""),[text,setText]=useState(""),[attachments,setAttachments]=useState<File[]>([]);
  const [sending,setSending]=useState(false),[recording,setRecording]=useState(false),[error,setError]=useState(""),[toast,setToast]=useState<{id:number;name:string}|null>(null);
  const [notificationPermission,setNotificationPermission]=useState<NotificationPermission>("default");
  const selectedRef=useRef<number|null>(null),openRef=useRef(false),lastNotificationId=useRef(0),messagesEnd=useRef<HTMLDivElement|null>(null);
  const fileInput=useRef<HTMLInputElement|null>(null),cameraInput=useRef<HTMLInputElement|null>(null),recorderRef=useRef<MediaRecorder|null>(null),chunksRef=useRef<Blob[]>([]),attachmentsRef=useRef<File[]>([]),audioContextRef=useRef<AudioContext|null>(null);

  useEffect(()=>{selectedRef.current=selectedId;},[selectedId]);
  useEffect(()=>{openRef.current=open;},[open]);

  const markRead=useCallback(async(senderId:number)=>{
    await fetch(`/api/chat?scope=${encodeURIComponent(scope)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({senderId})});
  },[scope]);

  const unlockNotificationSound=useCallback(()=>{
    try{
      const context=audioContextRef.current||new AudioContext();audioContextRef.current=context;
      if(context.state==="suspended")void context.resume().catch(()=>undefined);
    }catch{/* In-app notifications continue silently when Web Audio is unavailable. */}
  },[]);

  const playNotificationSound=useCallback(()=>{
    try{
      const context=audioContextRef.current||new AudioContext();audioContextRef.current=context;
      const play=()=>{const now=context.currentTime,oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";oscillator.frequency.setValueAtTime(880,now);oscillator.frequency.exponentialRampToValueAtTime(660,now+.32);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.14,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.42);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now);oscillator.stop(now+.44);};
      if(context.state==="suspended")void context.resume().then(play).catch(()=>undefined);else play();
    }catch{/* The visual notification remains available if sound playback is blocked. */}
  },[]);

  const showNotification=useCallback((latest:NonNullable<ChatPayload["latestUnread"]>)=>{
    if(latest.id<=lastNotificationId.current)return;
    lastNotificationId.current=latest.id;
    if(openRef.current&&selectedRef.current===latest.senderId)return;
    setToast({id:latest.id,name:latest.senderName});
    playNotificationSound();
    if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
      try{new Notification(`Message from ${latest.senderName}`,{body:"You have a new chat message.",icon:"/brands/aryan-gold.webp",tag:`chat-${latest.id}`});}catch{/* In-app notifications remain available where native browser notifications are restricted. */}
    }
  },[playNotificationSound]);

  const refresh=useCallback(async(conversationId?:number|null,notify=true)=>{
    const current=conversationId===undefined?selectedRef.current:conversationId;
    try{
      const suffix=current?`&with=${current}`:"";
      const response=await fetch(`/api/chat?scope=${encodeURIComponent(scope)}${suffix}`,{cache:"no-store"});
      const result=await response.json() as ChatPayload;
      if(!response.ok){if(response.status!==401)setError(result.error||"Unable to load chat.");return;}
      setActor(result.actor);setDirectory(result.directory||[]);
      if(current)setMessages(result.messages||[]);
      if(notify&&result.latestUnread)showNotification(result.latestUnread);
      if(current&&openRef.current&&(result.messages||[]).some(message=>message.senderUserId===current&&!message.readAt)){
        await markRead(current);
        setDirectory(users=>users.map(user=>user.id===current?{...user,unreadCount:0}:user));
      }
      setError("");
    }catch{setError("Chat is temporarily unavailable.");}
  },[markRead,scope,showNotification]);

  useEffect(()=>{
    const starter=window.setTimeout(()=>void refresh(null,true),0);
    const timer=window.setInterval(()=>void refresh(undefined,true),5000);
    return()=>{window.clearTimeout(starter);window.clearInterval(timer);};
  },[refresh]);
  useEffect(()=>{if(open&&selectedId)void refresh(selectedId,false);},[open,refresh,selectedId]);
  useEffect(()=>{if(open&&selectedId)messagesEnd.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,open,selectedId]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),5500);return()=>window.clearTimeout(timer);},[toast]);
  useEffect(()=>{const close=(event:globalThis.KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[]);
  useEffect(()=>{window.addEventListener("pointerdown",unlockNotificationSound,{once:true});window.addEventListener("keydown",unlockNotificationSound,{once:true});return()=>{window.removeEventListener("pointerdown",unlockNotificationSound);window.removeEventListener("keydown",unlockNotificationSound);};},[unlockNotificationSound]);
  useEffect(()=>()=>{const recorder=recorderRef.current;if(recorder&&recorder.state!=="inactive")recorder.stop();recorder?.stream.getTracks().forEach(track=>track.stop());},[]);

  const selected=directory.find(user=>user.id===selectedId)||null;
  const unread=directory.reduce((sum,user)=>sum+Number(user.unreadCount||0),0);
  const filtered=useMemo(()=>{const query=search.trim().toLowerCase();return query?directory.filter(user=>`${user.displayName} ${user.username} ${user.roleLabel}`.toLowerCase().includes(query)):directory;},[directory,search]);

  async function selectUser(user:ChatUser){setSelectedId(user.id);setMessages([]);setError("");await refresh(user.id,false);}
  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selectedId||sending||(!text.trim()&&!attachments.length))return;setSending(true);setError("");
    const form=new FormData();form.set("recipientId",String(selectedId));form.set("text",text.trim());attachments.forEach(file=>form.append("attachments",file));
    try{const response=await fetch(`/api/chat?scope=${encodeURIComponent(scope)}`,{method:"POST",body:form});const result=await response.json() as {error?:string};if(!response.ok){setError(result.error||"Unable to send message.");return;}setText("");replaceAttachments([]);await refresh(selectedId,false);}
    catch{setError("Unable to send message. Check the connection and try again.");}finally{setSending(false);}
  }
  function composerKey(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}
  function replaceAttachments(files:File[]){attachmentsRef.current=files;setAttachments(files);}
  function chooseFiles(files:FileList|File[]|null|undefined){
    const chosen=Array.from(files||[]);if(!chosen.length)return;
    const combined=[...attachmentsRef.current];const known=new Set(combined.map(file=>`${file.name}:${file.size}:${file.lastModified}`));
    chosen.forEach(file=>{const key=`${file.name}:${file.size}:${file.lastModified}`;if(!known.has(key)){combined.push(file);known.add(key);}});
    if(combined.length>10)setError("You can send up to 10 files at once.");else setError("");
    replaceAttachments(combined.slice(0,10));
  }
  async function enableNotifications(){if(typeof Notification==="undefined")return;try{const permission=await Notification.requestPermission();setNotificationPermission(permission);}catch{setError("Browser notifications are not available here. In-app chat alerts will still appear.");}}
  async function startRecording(){
    if(recording){recorderRef.current?.stop();return;}
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError("Voice recording is not supported on this device.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const preferred=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);chunksRef.current=[];recorderRef.current=recorder;
      recorder.ondataavailable=event=>{if(event.data.size)chunksRef.current.push(event.data);};
      recorder.onstop=()=>{const mime=recorder.mimeType.split(";")[0]||"audio/webm";const extension=mime.includes("ogg")?"ogg":mime.includes("mp4")?"m4a":mime.includes("mpeg")?"mp3":mime.includes("wav")?"wav":"webm";const blob=new Blob(chunksRef.current,{type:mime});if(blob.size)chooseFiles([new File([blob],`voice-note-${Date.now()}.${extension}`,{type:mime})]);stream.getTracks().forEach(track=>track.stop());setRecording(false);};
      recorder.start();setRecording(true);setError("");
    }catch(caught){
      const errorName=caught instanceof DOMException?caught.name:"";
      if(errorName==="NotAllowedError")setError("Microphone permission was blocked. Allow microphone access for this site, then tap the microphone again.");
      else if(errorName==="NotFoundError")setError("No microphone was found on this device.");
      else if(errorName==="NotReadableError")setError("The microphone is already in use by another application.");
      else setError("Microphone access was not available. Check the device permission and try again.");
    }
  }

  return <>
    {toast&&<button className="chat-toast" onClick={()=>{setOpen(true);setToast(null);}} aria-live="polite"><MessageCircle/><span>Received message from: <strong>{toast.name}</strong></span><X onClick={event=>{event.stopPropagation();setToast(null);}}/></button>}
    <button className="chat-launcher" onClick={()=>setOpen(value=>!value)} aria-label={open?"Close chat":"Open chat"} aria-expanded={open}><MessageCircle/>{unread>0&&<span>{unread>99?"99+":unread}</span>}</button>
    {open&&<section className="chat-dock" role="dialog" aria-label="User chat">
      <header className="chat-dock-header"><div><MessageCircle/><span><strong>Team chat</strong><small>{actor?`Signed in as ${actor.displayName}`:"Connecting…"}</small></span></div><div>{notificationPermission==="default"&&<button onClick={()=>void enableNotifications()} title="Enable desktop notifications" aria-label="Enable desktop notifications"><BellRing/></button>}<button onClick={()=>setOpen(false)} aria-label="Close chat"><X/></button></div></header>
      <div className="chat-dock-body">
        <aside className={`chat-directory ${selected?"has-selection":""}`}><label><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search username" aria-label="Search chat users"/></label><div>{filtered.length?filtered.map(user=><button className={selectedId===user.id?"active":""} key={user.id} onClick={()=>void selectUser(user)}><i>{initials(user.displayName)}</i><span><strong>{user.displayName}</strong><small>@{user.username} · {user.roleLabel}</small></span>{user.unreadCount>0&&<b>{user.unreadCount}</b>}</button>):<p>No users found.</p>}</div></aside>
        <main className={`chat-conversation ${selected?"selected":""}`}>
          {selected?<><header><button onClick={()=>setSelectedId(null)} aria-label="Back to users">‹</button><i>{initials(selected.displayName)}</i><span><strong>{selected.displayName}</strong><small>@{selected.username} · {selected.roleLabel}</small></span></header>
            <div className="chat-messages">{messages.length?messages.map(message=><article className={message.senderUserId===actor?.id?"mine":"theirs"} key={message.id}><div>{message.body&&<p>{message.body}</p>}{message.attachmentUrl&&<MessageAttachment message={message}/>}<small>{time(message.createdAt)}{message.senderUserId===actor?.id&&(message.readAt?" · Read":" · Sent")}</small></div></article>):<div className="chat-empty"><MessageCircle/><strong>Start the conversation</strong><span>Send a message or share a document, photo, or voice note.</span></div>}<div ref={messagesEnd}/></div>
            <form className="chat-composer" onSubmit={event=>void send(event)}><input ref={fileInput} hidden multiple type="file" accept={acceptTypes} onChange={event=>{chooseFiles(event.target.files);event.currentTarget.value="";}}/><input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={event=>{chooseFiles(event.target.files);event.currentTarget.value="";}}/>{attachments.length>0&&<div className="chat-selected-files" aria-label={`${attachments.length} selected ${attachments.length===1?"file":"files"}`}><div className="chat-selected-files-summary"><span>{attachments.length} {attachments.length===1?"file":"files"} selected</span><button type="button" onClick={()=>replaceAttachments([])}>Clear all</button></div>{attachments.map((attachment,index)=><div className="chat-selected-file" key={`${attachment.name}-${attachment.size}-${attachment.lastModified}`}><FileText/><span><strong>{attachment.name}</strong><small>{fileSize(attachment.size)}</small></span><button type="button" onClick={()=>replaceAttachments(attachmentsRef.current.filter((_,fileIndex)=>fileIndex!==index))} aria-label={`Remove ${attachment.name}`}><X/></button></div>)}</div>}<div className="chat-compose-row"><button type="button" onClick={()=>fileInput.current?.click()} title="Attach files" aria-label="Attach files"><Paperclip/></button><button type="button" onClick={()=>cameraInput.current?.click()} title="Capture a photo" aria-label="Capture a photo"><Camera/></button><button type="button" className={recording?"recording":""} onClick={()=>void startRecording()} title={recording?"Stop recording":"Record voice note"} aria-label={recording?"Stop recording":"Record voice note"}>{recording?<Square/>:<Mic/>}</button><textarea value={text} onChange={event=>setText(event.target.value)} onKeyDown={composerKey} rows={1} maxLength={4000} placeholder={recording?"Recording voice note…":"Type a message"} aria-label="Message"/><button className="chat-send" disabled={sending||(!text.trim()&&!attachments.length)} aria-label="Send message"><Send/></button></div>{recording&&<p className="chat-recording"><span/>Recording… tap stop when finished.</p>}</form></>:<div className="chat-welcome"><MessageCircle/><strong>Select a username</strong><span>Choose any Admin, Branch, Head Office, Floor, or Accounts user to start chatting.</span><div><FileUp/> PDF, images, Excel, Word and more <Mic/> Voice notes <Camera/> Camera capture</div></div>}
          {error&&<button className="chat-error" onClick={()=>setError("")} aria-label={`${error} Dismiss`}>{error}<X/></button>}
        </main>
      </div>
    </section>}
  </>;
}

function MessageAttachment({message}:{message:ChatMessage}){
  if(!message.attachmentUrl)return null;
  if(message.attachmentMime?.startsWith("image/"))return <a className="chat-image" href={message.attachmentUrl} target="_blank" rel="noreferrer"><Image src={message.attachmentUrl} alt={message.attachmentName||"Shared image"} width={300} height={210} unoptimized/><span>{message.attachmentName}</span></a>;
  if(message.attachmentMime?.startsWith("audio/"))return <div className="chat-audio"><audio controls preload="metadata" src={message.attachmentUrl}/><span>{message.attachmentName}</span></div>;
  return <a className="chat-file" href={message.attachmentUrl} target="_blank" rel="noreferrer"><FileText/><span><strong>{message.attachmentName}</strong><small>{fileSize(message.attachmentSize)}</small></span><Download/></a>;
}
