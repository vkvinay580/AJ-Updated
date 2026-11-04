import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { one } from "@/lib/db";
import { ARYAN_GOLD_LEGAL_NAME } from "@/lib/internal-stock-transfer";

const inr = (paise:number) => `INR ${(Number(paise)/100).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const grams = (mg:number) => `${(Number(mg)/1000).toLocaleString("en-IN", { minimumFractionDigits:3, maximumFractionDigits:3 })} g`;
const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function underThousand(value:number) {
  let text = "";
  if (value >= 100) { text += `${ones[Math.floor(value/100)]} Hundred `; value %= 100; }
  if (value >= 20) text += `${tens[Math.floor(value/10)]} ${ones[value%10]} `;
  else text += `${ones[value]} `;
  return text.trim();
}

function numberWords(value:number) {
  let number = Math.floor(Math.abs(value));
  if (!number) return "Zero";
  const parts:string[] = [];
  for (const [size,label] of [[10000000,"Crore"],[100000,"Lakh"],[1000,"Thousand"]] as Array<[number,string]>) {
    if (number >= size) { parts.push(`${underThousand(Math.floor(number/size))} ${label}`); number %= size; }
  }
  if (number) parts.push(underThousand(number));
  return parts.join(" ");
}

function amountWords(paise:number) {
  const rupees = Math.floor(Number(paise)/100);
  const fraction = Math.abs(Number(paise))%100;
  return `${numberWords(rupees)}${fraction?` and ${numberWords(fraction)} Paise`:""} Only`.toUpperCase();
}

export async function GET(request:NextRequest, context:{ params:Promise<{id:string}> }) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.",403);
  const session = await getBranchSession();
  if (!session) return apiError("Your branch session has expired.",401);
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid stock transfer.");

  const transfer = await one<RowDataPacket>(`SELECT id,branch_id AS branchId,itr_number AS itrNumber,
    DATE_FORMAT(itr_date,'%d-%m-%Y') AS itrDate,origin_state AS originState,origin_state_code AS originStateCode,
    place_of_supply AS placeOfSupply,transporter_name AS transporterName,transporter_gstin AS transporterGstin,
    transportation_mode AS transportationMode,shipper_details AS shipperDetails,consignee_details AS consigneeDetails,
    purpose_of_movement AS purposeOfMovement,shipping_address AS shippingAddress,gross_weight_mg AS grossWeightMg,
    transfer_value_paise AS transferValuePaise FROM branch_gold_transfers
    WHERE id=? AND branch_id=? AND itr_number IS NOT NULL LIMIT 1`, [id,session.branchId]);
  if (!transfer) return apiError("Internal Stock Transfer report not found.",404);

  const doc = new PDFDocument({ size:"A4",margin:30,info:{ Title:String(transfer.itrNumber),Author:ARYAN_GOLD_LEGAL_NAME } });
  const chunks:Buffer[] = [];
  doc.on("data",chunk=>chunks.push(chunk));
  const done = new Promise<Buffer>(resolve=>doc.on("end",()=>resolve(Buffer.concat(chunks))));
  const pageLeft = 30, pageRight = 565, pageWidth = pageRight-pageLeft;
  const gold = "#9b6c19", ink = "#20262b", muted = "#657078", line = "#cfd5d9", soft = "#fbf7ed";

  doc.font("Helvetica-Bold").fillColor(gold).fontSize(17).text(ARYAN_GOLD_LEGAL_NAME,pageLeft,31,{width:pageWidth,align:"center"});
  doc.fillColor(ink).fontSize(10).text("INTERNAL STOCK TRANSFER REPORT",pageLeft,53,{width:pageWidth,align:"center"});
  doc.font("Helvetica").fillColor(muted).fontSize(6.5).text("Original for movement of consolidated second-hand pre-owned gold stock",pageLeft,68,{width:pageWidth,align:"center"});
  doc.strokeColor(gold).lineWidth(1.7).moveTo(pageLeft,82).lineTo(pageRight,82).stroke();

  const metaY = 91, metaH = 69, metaMid = 300;
  doc.fillColor(soft).rect(pageLeft,metaY,pageWidth,metaH).fill().strokeColor(line).lineWidth(.7).rect(pageLeft,metaY,pageWidth,metaH).stroke();
  doc.moveTo(metaMid,metaY).lineTo(metaMid,metaY+metaH).stroke();
  const meta = (label:string,value:unknown,x:number,y:number,width:number) => {
    doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text(label,x,y,{width});
    doc.font("Helvetica").fontSize(7.2).fillColor(ink).text(String(value||"—"),x,y+8,{width,height:10,ellipsis:true});
  };
  meta("INTERNAL STOCK TRANSFER NO.",transfer.itrNumber,39,99,248);
  meta("INTERNAL STOCK TRANSFER DATE",transfer.itrDate,309,99,246);
  meta("STATE / STATE CODE",`${transfer.originState || "—"} / ${transfer.originStateCode || "—"}`,39,122,248);
  meta("PLACE OF SUPPLY",transfer.placeOfSupply,309,122,246);
  meta("TRANSPORTER NAME",transfer.transporterName,39,145,248);
  meta("TRANSPORTER GSTIN",transfer.transporterGstin||"—",309,145,246);

  const partyY = 170, partyGap = 8, partyWidth = (pageWidth-partyGap)/2, partyH = 112;
  const detailBox = (title:string,value:unknown,x:number,width:number) => {
    doc.strokeColor(line).rect(x,partyY,width,partyH).stroke();
    doc.fillColor(gold).rect(x,partyY,width,19).fill();
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff").text(title,x+8,partyY+6,{width:width-16});
    doc.font("Helvetica").fontSize(7).fillColor(ink).text(String(value||"—"),x+9,partyY+27,{width:width-18,height:partyH-34,ellipsis:true,lineGap:2});
  };
  detailBox("SHIPPER",transfer.shipperDetails,pageLeft,partyWidth);
  detailBox("CONSIGNEE (BILLING ADDRESS)",transfer.consigneeDetails,pageLeft+partyWidth+partyGap,partyWidth);

  let y = partyY+partyH+8;
  doc.strokeColor(line).rect(pageLeft,y,pageWidth,28).stroke();
  doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("PURPOSE OF MOVEMENT",pageLeft+9,y+6,{width:132});
  doc.font("Helvetica-Bold").fontSize(8).fillColor(ink).text(String(transfer.purposeOfMovement||"—"),pageLeft+148,y+6,{width:255});
  doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("MODE",pageLeft+415,y+6,{width:38});
  doc.font("Helvetica").fontSize(7).fillColor(ink).text(String(transfer.transportationMode||"—"),pageLeft+455,y+6,{width:70});

  y += 36;
  doc.strokeColor(line).rect(pageLeft,y,pageWidth,76).stroke();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text("SHIPPING ADDRESS",pageLeft+9,y+8,{width:145});
  doc.font("Helvetica").fontSize(7).fillColor(ink).text(String(transfer.shippingAddress||"—"),pageLeft+9,y+22,{width:pageWidth-18,height:47,ellipsis:true,lineGap:1.5});

  y += 85;
  const widths = [25,240,45,50,75,100];
  const columns = widths.map((_,index)=>pageLeft+widths.slice(0,index).reduce((total,width)=>total+width,0));
  doc.fillColor("#30383e").rect(pageLeft,y,pageWidth,23).fill();
  const headers = ["Sl.","Description of Consolidated Stock","HSN","Qty","Gross Weight","Assigned Transfer Value"];
  doc.font("Helvetica-Bold").fontSize(6).fillColor("#ffffff");
  headers.forEach((header,index)=>doc.text(header,columns[index]+4,y+6,{width:widths[index]-8,align:index>1?"center":"left",height:13}));
  y += 23;
  doc.strokeColor(line).rect(pageLeft,y,pageWidth,43).stroke();
  for (let index=1;index<columns.length;index++) doc.moveTo(columns[index],y).lineTo(columns[index],y+43).stroke();
  const values = ["1","Second-hand Pre-owned Gold Jewelry items\n(Transferred at Cost for Hub Consolidation)","7113","1 Batch",grams(transfer.grossWeightMg),inr(transfer.transferValuePaise)];
  doc.font("Helvetica").fontSize(6.5).fillColor(ink);
  values.forEach((entry,index)=>doc.text(entry,columns[index]+4,y+8,{width:widths[index]-8,align:index>1?"center":"left",height:30,ellipsis:true,lineGap:1}));

  y += 51;
  const summaryX = 300, summaryWidth = pageRight-summaryX, valueX = 452;
  const summary = [
    ["Gross Declared Value",inr(transfer.transferValuePaise)],
    ["Taxable Margin Value (At Cost)",inr(0)],
    ["IGST Rate Applicable","3% on Margin"],
    ["Total IGST Payable",inr(0)],
  ];
  doc.strokeColor(line).rect(summaryX,y,summaryWidth,65).stroke();
  summary.forEach(([label,value],index)=>{
    const rowY = y+7+(index*14);
    doc.font(index===3?"Helvetica-Bold":"Helvetica").fontSize(6.8).fillColor(ink).text(label,summaryX+8,rowY,{width:140});
    doc.text(value,valueX,rowY,{width:pageRight-valueX-8,align:"right"});
  });

  y += 76;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text("MANDATORY TRANSIT DECLARATIONS & CONDITIONS",pageLeft,y,{width:pageWidth});
  y += 14;
  const declarations = [
    "1. Interstate stock transfer executed between distinct corporate registrations under Schedule I of the CGST Act, 2017.",
    "2. Valuation criteria established under Rule 32(5) Second-Hand Goods Scheme. Inventory is transferred at historic cost to maintain scheme continuity at destination; taxable margin is Nil.",
    "3. Original consumer purchase voucher logs are linked to internal batch tracking for multi-state cross-verification.",
  ];
  doc.font("Helvetica").fontSize(6.5).fillColor(ink);
  declarations.forEach(text=>{ doc.text(text,pageLeft,y,{width:pageWidth,align:"justify",lineGap:1}); y=doc.y+4; });

  y += 4;
  doc.fillColor(soft).rect(pageLeft,y,pageWidth,29).fill().strokeColor(line).rect(pageLeft,y,pageWidth,29).stroke();
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(gold).text("AMOUNT IN WORDS",pageLeft+9,y+6,{width:105});
  doc.fontSize(7).fillColor(ink).text(amountWords(transfer.transferValuePaise),pageLeft+115,y+6,{width:pageWidth-124,height:18,ellipsis:true});

  y += 45;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text(`For ${ARYAN_GOLD_LEGAL_NAME}`,pageRight-190,y,{width:190,align:"center"});
  doc.strokeColor(muted).moveTo(pageRight-190,y+35).lineTo(pageRight,y+35).stroke();
  doc.font("Helvetica").fontSize(6).fillColor(muted).text("Authorised Signatory",pageRight-190,y+40,{width:190,align:"center"});
  doc.fontSize(5.5).text(`Generated for dispatch #${transfer.id} · Branch ${transfer.branchId}`,pageLeft,800,{width:pageWidth,align:"left"});
  doc.end();

  const pdf = await done;
  const inline = request.nextUrl.searchParams.get("view") === "1" || request.nextUrl.searchParams.get("print") === "1";
  const safeName = String(transfer.itrNumber).replaceAll("/","-");
  return new NextResponse(new Uint8Array(pdf), { headers:{ "Content-Type":"application/pdf","Content-Disposition":`${inline?"inline":"attachment"}; filename="${safeName}.pdf"`,"Cache-Control":"private, no-store" } });
}
