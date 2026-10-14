import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated } from "@/lib/api";
import { one } from "@/lib/db";

export async function GET(request:NextRequest,context:{params:Promise<{id:string;kind:string}>}){
  const {error,session}=await authenticated(request);if(error||!session)return error;
  const {id,kind}=await context.params;if(!["customer","item","signature"].includes(kind))return apiError("Invalid image.",400);
  const bill=await one<RowDataPacket>(`SELECT c.customer_image_path customerPath,b.ornament_image_path itemPath,b.signature_image_path signaturePath FROM bills b JOIN customers c ON c.id=b.customer_id AND c.company_id=b.company_id WHERE b.id=? AND b.company_id=?`,[Number(id),session.companyId]);
  if(!bill)return apiError("Bill not found.",404);
  let itemPaths:string[]=[];if(kind==="item"){try{const parsed=JSON.parse(String(bill.itemPath||""));itemPaths=Array.isArray(parsed)?parsed:[]}catch{if(bill.itemPath)itemPaths=[String(bill.itemPath)]}}
  const index=Math.max(0,Number(request.nextUrl.searchParams.get("index")||0));
  const stored=kind==="customer"?bill.customerPath:kind==="item"?itemPaths[index]:bill.signaturePath;
  if(!stored)return apiError("Image not found.",404);
  const folder=kind==="customer"?"kyc":kind==="item"?"ornaments":"signatures",root=path.resolve(process.cwd(),"storage",folder),filePath=path.resolve(root,String(stored));
  if(!filePath.startsWith(`${root}${path.sep}`))return apiError("Invalid image path.",400);
  try{const data=await readFile(filePath),ext=path.extname(filePath).toLowerCase(),contentType=ext===".png"?"image/png":ext===".webp"?"image/webp":"image/jpeg";return new NextResponse(data,{headers:{"Content-Type":contentType,"Cache-Control":"private, no-store"}})}catch{return apiError("Image not found.",404)}
}
