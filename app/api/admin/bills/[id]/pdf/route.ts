import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { one, rows } from "@/lib/db";
import { getCompanyInvoiceProfile, getCompanySeal } from "@/lib/company-invoice";

const inr=(paise:number)=>`INR ${(Number(paise)/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function underThousand(value:number){let text="";if(value>=100){text+=`${ones[Math.floor(value/100)]} Hundred `;value%=100}if(value>=20)text+=`${tens[Math.floor(value/10)]} ${ones[value%10]} `;else text+=`${ones[value]} `;return text.trim()}
function numberWords(value:number){let n=Math.floor(Math.abs(value));if(!n)return"Zero";const parts:string[]=[];for(const[size,label]of[[10000000,"Crore"],[100000,"Lakh"],[1000,"Thousand"]] as Array<[number,string]>){if(n>=size){parts.push(`${underThousand(Math.floor(n/size))} ${label}`);n%=size}}if(n)parts.push(underThousand(n));return parts.join(" ")}
function amountWords(paise:number){const rupees=Math.floor(Number(paise)/100),fraction=Math.abs(Number(paise))%100;return`INR ${numberWords(rupees)}${fraction?` and ${numberWords(fraction)} Paise`:""} Only`}
const rate=(bps:number)=>`${(Number(bps)/100).toFixed(2).replace(/\.00$/,"")}%`;

export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}){
  const {error,actor:session}=await businessAuthenticated(request); if(error||!session)return error;
  const id=Number((await context.params).id); if(!Number.isInteger(id))return apiError("Invalid bill.");
  const bill=await one<RowDataPacket>(`SELECT b.bill_number billNumber,b.transaction_type transactionType,DATE_FORMAT(b.bill_date,'%d-%b-%Y') billDate,b.subtotal_paise subtotalPaise,b.tax_paise taxPaise,b.cgst_paise cgstPaise,b.sgst_paise sgstPaise,b.cgst_rate_bps cgstRateBps,b.sgst_rate_bps sgstRateBps,b.adjustment_paise adjustmentPaise,b.total_paise totalPaise,b.release_place releasePlace,b.release_amount_paise releaseAmountPaise,b.payment_method paymentMethod,b.notes,b.ornament_image_path ornamentPath,b.signature_image_path signaturePath,c.name customerName,c.phone customerPhone,c.address customerAddress,c.city customerCity,c.state customerState,c.state_code customerStateCode,c.place_of_supply placeOfSupply,c.postal_code customerPostalCode,c.gstin customerGstin,c.customer_image_path customerImagePath,(SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='aadhaar' LIMIT 1) aadhaarLast4,(SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='pan' LIMIT 1) panLast4 FROM bills b JOIN customers c ON c.id=b.customer_id AND c.company_id=b.company_id WHERE b.id=? AND b.company_id=? AND (? IS NULL OR b.origin_branch_id=?)`,[id,session.companyId,session.branchId,session.branchId]);
  if(!bill)return apiError("Bill not found.",404);
  if(bill.transactionType==="purchase"){bill.taxPaise=0;bill.cgstPaise=0;bill.sgstPaise=0;bill.cgstRateBps=0;bill.sgstRateBps=0;bill.totalPaise=Number(bill.subtotalPaise)+Number(bill.adjustmentPaise)}
  bill.payablePaise=Math.max(0,Number(bill.totalPaise)-Number(bill.releaseAmountPaise||0));
  const items=await rows<RowDataPacket>(`SELECT description,item_description itemDescription,hsn_code hsnCode,purity,gross_weight_mg grossWeightMg,stone_weight_mg stoneWeightMg,weight_mg weightMg,rate_paise_per_gram ratePaisePerGram,making_paise makingPaise,amount_paise amountPaise FROM bill_items WHERE bill_id=? ORDER BY id`,[id]);
  const payments=await rows<RowDataPacket>(`SELECT payment_method method,amount_paise amountPaise,reference_text referenceText FROM bill_payments WHERE bill_id=? ORDER BY id`,[id]);
  if(!payments.length)payments.push({method:bill.paymentMethod,amountPaise:bill.payablePaise,referenceText:null} as RowDataPacket);
  const profile=getCompanyInvoiceProfile(session.companySlug), doc=new PDFDocument({size:"A4",margin:42,info:{Title:String(bill.billNumber)}}),chunks:Buffer[]=[];
  doc.on("data",chunk=>chunks.push(chunk)); const done=new Promise<Buffer>(resolve=>doc.on("end",()=>resolve(Buffer.concat(chunks))));
  const isSale=bill.transactionType==="sale",gold="#9e711b",line="#d7dce1",invoiceTitle=isSale?"URD SALE INVOICE":"URD PURCHASE INVOICE";
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#333").text(`${invoiceTitle} (ORIGINAL)`,{align:"center"});
  const top=doc.y+4;
  const publicRoot=path.resolve(process.cwd(),"public"),logoPath=path.resolve(publicRoot,String(session.companyLogo).replace(/^[/\\]+/,"")),showLogo=logoPath.startsWith(`${publicRoot}${path.sep}`)&&existsSync(logoPath);
  if(showLogo){try{doc.image(logoPath,42,top,{fit:[48,48],align:"center",valign:"center"})}catch{}}
  const headerCompanyX=showLogo?98:42,companyWidth=showLogo?264:320;
  doc.fontSize(17).fillColor(gold).text(session.companyName,headerCompanyX,top,{width:companyWidth});
  doc.font("Helvetica").fontSize(6.5).fillColor("#333").text(profile.address,headerCompanyX,top+20,{width:companyWidth,height:17,ellipsis:true}).font("Helvetica-Bold").text(`GSTIN/UIN: ${profile.gstin}`,headerCompanyX,top+38).font("Helvetica").text(`State: ${profile.state}, Code: ${profile.stateCode}  |  Contact: ${profile.phone}`,headerCompanyX,top+48);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(gold).text(invoiceTitle,375,top+2,{width:178,align:"right"}).fontSize(7).fillColor("#333").text(String(bill.billNumber),375,top+20,{width:178,align:"right"}).font("Helvetica").text(`Dated: ${bill.billDate}`,375,top+32,{width:178,align:"right"});
  doc.y=top+59;doc.lineWidth(2).strokeColor(gold).moveTo(42,doc.y).lineTo(553,doc.y).stroke();doc.lineWidth(1);
  const partyY=doc.y+6,partyH=62;doc.strokeColor(line).rect(42,partyY,511,partyH).stroke().moveTo(374,partyY).lineTo(374,partyY+partyH).stroke();
  const customerPhotoPath=bill.customerImagePath?path.resolve(process.cwd(),"storage","kyc",String(bill.customerImagePath)):"",customerPhotoExt=path.extname(customerPhotoPath).toLowerCase(),showCustomerPhoto=Boolean(customerPhotoPath&&existsSync(customerPhotoPath)&&[".jpg",".jpeg",".png"].includes(customerPhotoExt)),customerTextWidth=showCustomerPhoto?235:310;
  doc.font("Helvetica-Bold").fontSize(5.5).fillColor(gold).text(isSale?"BUYER (BILL TO)":"SELLER (BILL FROM)",49,partyY+5).fontSize(8).fillColor("#222").text(String(bill.customerName),49,partyY+14,{width:customerTextWidth});
  doc.font("Helvetica").fontSize(6).text([bill.customerAddress,bill.customerCity,bill.customerState,bill.customerPostalCode].filter(Boolean).join(", "),49,partyY+25,{width:customerTextWidth,height:9,ellipsis:true}).text(`Contact: +91 ${bill.customerPhone}${bill.customerGstin?`  |  GSTIN/UIN: ${bill.customerGstin}`:""}`,49,partyY+36,{width:customerTextWidth}).text(`Aadhaar: ${bill.aadhaarLast4?`XXXX XXXX ${bill.aadhaarLast4}`:"-"}  |  PAN: ${bill.panLast4?`XXXXXX${bill.panLast4}`:"-"}`,49,partyY+47,{width:customerTextWidth});
  if(showCustomerPhoto){doc.strokeColor(line).rect(307,partyY+5,52,52).stroke();try{doc.image(customerPhotoPath,310,partyY+8,{fit:[46,46],align:"center",valign:"center"})}catch{}}
  const paymentSummary=payments.map(payment=>String(payment.method).replaceAll("_"," ")).join(" + ");
  doc.font("Helvetica-Bold").fontSize(5.5).fillColor(gold).text("INVOICE DETAILS",381,partyY+6).font("Helvetica").fontSize(6.5).fillColor("#222").text(`Invoice No.: ${bill.billNumber}`,381,partyY+18).text(`Dated: ${bill.billDate}`,381,partyY+31).text(`Payment: ${paymentSummary}`,381,partyY+44,{width:164,height:10,ellipsis:true});
  doc.y=partyY+partyH+7;
  const columns=[
    {x:42,width:18,align:"left" as const},{x:60,width:92,align:"left" as const},{x:152,width:43,align:"left" as const},{x:195,width:38,align:"left" as const},{x:233,width:48,align:"right" as const},{x:281,width:48,align:"right" as const},{x:329,width:62,align:"right" as const},{x:391,width:60,align:"right" as const},{x:451,width:102,align:"right" as const},
  ];
  const tableText=(value:string,column:number,y:number)=>doc.text(value,columns[column].x,y,{width:columns[column].width,align:columns[column].align,lineBreak:false});
  const headerY=doc.y;
  doc.font("Helvetica-Bold").fontSize(8);
  const tableHeaders=["#","Description","HSN/SAC","Purity","Gross W","Net W","Rate / g","Other","Amount"];
  tableHeaders.forEach((value,index)=>tableText(value,index,headerY));
  doc.y=headerY+15;
  doc.moveTo(42,doc.y).lineTo(553,doc.y).stroke();
  doc.font("Helvetica");
  items.forEach((item,index)=>{
    const y=doc.y+6;
    const values=[String(index+1),item.description,item.hsnCode||(/gold ornament/i.test(String(item.description))?"711319":"-"),item.purity||"-",`${(Number(item.grossWeightMg||item.weightMg)/1000).toFixed(3)} g`,`${(Number(item.weightMg)/1000).toFixed(3)} g`,inr(item.ratePaisePerGram),inr(item.makingPaise),inr(item.amountPaise)];
    values.forEach((value,column)=>tableText(value,column,y));
    if(item.itemDescription){doc.fontSize(6).fillColor("#666").text(String(item.itemDescription),columns[1].x,y+10,{width:columns[1].width,height:12,ellipsis:true});doc.fontSize(8).fillColor("#222");}
    doc.y=y+(item.itemDescription?28:20);
  });
  doc.moveDown();
  let ornamentStoredPaths:string[]=[];try{const parsed=JSON.parse(String(bill.ornamentPath||""));ornamentStoredPaths=Array.isArray(parsed)?parsed.slice(0,4):[]}catch{if(bill.ornamentPath)ornamentStoredPaths=[String(bill.ornamentPath)]}
  const ornamentPaths=ornamentStoredPaths.map(stored=>path.resolve(process.cwd(),"storage","ornaments",stored)).filter(imagePath=>existsSync(imagePath)&&[".jpg",".jpeg",".png"].includes(path.extname(imagePath).toLowerCase()));
  if(ornamentPaths.length){const gap=8,boxW=(511-gap*(ornamentPaths.length-1))/ornamentPaths.length,boxH=72;doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("ORNAMENT PHOTOS",42,doc.y,{width:511});const y=doc.y+4;ornamentPaths.forEach((imagePath,index)=>{const x=42+index*(boxW+gap);doc.strokeColor(line).rect(x,y,boxW,boxH).stroke();try{doc.image(imagePath,x+3,y+3,{fit:[boxW-6,boxH-6],align:"center",valign:"center"})}catch{}});doc.y=y+boxH+8;}
  const totalRow=(label:string,value:number,bold=false)=>{
    const y=doc.y+6;
    doc.font(bold?"Helvetica-Bold":"Helvetica").text(label,330,y,{width:105,align:"right",lineBreak:false}).text(inr(value),445,y,{width:108,align:"right",lineBreak:false});
    doc.y=y+15;
  };
  const grouped=new Map<string,number>();items.forEach(item=>grouped.set(item.hsnCode||"-",(grouped.get(item.hsnCode||"-")||0)+Number(item.amountPaise)));
  if(isSale){doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text("HSN/SAC TAX SUMMARY",42,doc.y);doc.y+=12;
  const taxX=[42,117,215,275,335,405,480],taxW=[75,98,60,60,70,75,73],taxHeaders=["HSN/SAC","Taxable Value","CGST Rate","CGST Amount","SGST Rate","SGST Amount","Total Tax"],taxY=doc.y;
  doc.fontSize(6).fillColor("#333");taxHeaders.forEach((v,i)=>doc.text(v,taxX[i],taxY,{width:taxW[i],align:i?"right":"left",lineBreak:false}));doc.y=taxY+12;doc.strokeColor(line).moveTo(42,doc.y).lineTo(553,doc.y).stroke();
  doc.font("Helvetica");for(const[hsn,taxable]of grouped){const y=doc.y+4,cgst=Math.round(taxable*Number(bill.cgstRateBps)/10000),sgst=Math.round(taxable*Number(bill.sgstRateBps)/10000),values=[hsn,inr(taxable),rate(bill.cgstRateBps),inr(cgst),rate(bill.sgstRateBps),inr(sgst),inr(cgst+sgst)];values.forEach((v,i)=>doc.text(v,taxX[i],y,{width:taxW[i],align:i?"right":"left",lineBreak:false}));doc.y=y+11}
  doc.font("Helvetica-Bold");const ty=doc.y+4;["Total",inr(bill.subtotalPaise),"",inr(bill.cgstPaise),"",inr(bill.sgstPaise),inr(bill.taxPaise)].forEach((v,i)=>doc.text(v,taxX[i],ty,{width:taxW[i],align:i?"right":"left",lineBreak:false}));doc.y=ty+15;
  doc.fontSize(7).text(`Tax Amount (in words): ${amountWords(bill.taxPaise)}`,42,doc.y,{width:511});doc.y+=20;}doc.strokeColor(line).moveTo(300,doc.y).lineTo(553,doc.y).stroke();
  const totalsTop=doc.y;if(bill.notes)doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("NOTES",42,totalsTop+6).font("Helvetica").fontSize(7).fillColor("#222").text(String(bill.notes),42,totalsTop+18,{width:270,height:28,ellipsis:true});
  doc.y=totalsTop;totalRow(isSale?"Taxable value":"Purchase value",bill.subtotalPaise);totalRow("Round off / adjustment",bill.adjustmentPaise);totalRow("TOTAL",bill.totalPaise,true);if(Number(bill.releaseAmountPaise)){totalRow(`Less: release at ${bill.releasePlace}`,bill.releaseAmountPaise);totalRow("PAYABLE TO CUSTOMER",bill.payablePaise,true)}doc.y=Math.max(doc.y,totalsTop+(Number(bill.releaseAmountPaise)?85:55));doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#222").text(`Amount Chargeable (in words): ${amountWords(bill.payablePaise)}`,42,doc.y,{width:511,lineBreak:false});doc.y+=14;
  doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("PAYMENT BREAKDOWN",42,doc.y,{width:511});doc.y+=9;
  payments.forEach(payment=>{const method=String(payment.method).replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());const reference=payment.referenceText?`  |  ${payment.referenceText}`:"";doc.font("Helvetica").fontSize(6.5).fillColor("#222").text(`${method}: ${inr(payment.amountPaise)}${reference}`,42,doc.y,{width:511,height:9,ellipsis:true});doc.y+=10;});
  doc.y+=5;doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text("DECLARATION, CONDITIONS & CUSTOMER ACKNOWLEDGEMENT",42,doc.y,{width:511});doc.moveDown(.2).font("Helvetica").fontSize(5.5).fillColor("#222").text("We declare that this document shows the actual price of the goods described and that all particulars are true and correct.",{width:511});doc.moveDown(.2);
  const conditions=[
    "1. I hereby declare that the ornaments brought by me for sale are my own property or ancestral property, and that they are not connected with any offence or crime. If found otherwise, I alone shall be held responsible, and not the company.",
    "2. I understand that once the ornaments are sold, the same ornaments may not be available with the company on the next day or thereafter.",
    "3. I hereby declare that the above statements are true to the best of my knowledge and belief, and that this declaration has been made voluntarily without any force, pressure, or under influence from anyone.",
  ];conditions.forEach(value=>{doc.text(value,{width:511,align:"justify"});doc.moveDown(.15)});
  doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("FOR THE ATTENTION OF GOVERNMENT AUTHORITIES:").moveDown(.1).font("Helvetica").fontSize(5.5).fillColor("#222").text("Government Authorities shall issue notice to the branches, grant 7 days time, and deal with the company only in accordance with Section 342 of BNSS (formerly Section 305 of CrPC).",{width:511,align:"justify"});
  const signatureY=doc.y+10,signatureW=180,signatureH=62,customerX=42,companyX=553-signatureW,signaturePath=bill.signaturePath?path.resolve(process.cwd(),"storage","signatures",String(bill.signaturePath)):"",signatureExt=path.extname(signaturePath).toLowerCase(),showSignature=Boolean(signaturePath&&existsSync(signaturePath)&&[".jpg",".jpeg",".png"].includes(signatureExt)),sealPath=path.join(process.cwd(),"public",getCompanySeal(session.companySlug));
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(gold).text("CUSTOMER SIGNATURE",customerX,signatureY,{width:signatureW,align:"center"}).text(`FOR ${session.companyName}`,companyX,signatureY,{width:signatureW,align:"center"});if(showSignature){try{doc.image(signaturePath,customerX+5,signatureY+13,{fit:[signatureW-10,signatureH-7],align:"center",valign:"bottom"})}catch{}}if(existsSync(sealPath)){try{doc.image(sealPath,companyX+5,signatureY+13,{fit:[signatureW-10,signatureH-7],align:"center",valign:"bottom"})}catch{}}doc.strokeColor("#4f5964").moveTo(customerX,signatureY+signatureH+10).lineTo(customerX+signatureW,signatureY+signatureH+10).stroke().moveTo(companyX,signatureY+signatureH+10).lineTo(companyX+signatureW,signatureY+signatureH+10).stroke();doc.font("Helvetica-Bold").fontSize(6).fillColor("#333").text(String(bill.customerName),customerX,signatureY+signatureH+15,{width:signatureW,align:"center"}).text("Seal & Authorised Signature",companyX,signatureY+signatureH+15,{width:signatureW,align:"center"});
  const footerY=signatureY+signatureH+28;doc.font("Helvetica").fontSize(6).fillColor("#333").text(`Customer: ${bill.customerName}  |  Aadhaar: ${bill.aadhaarLast4?`XXXX XXXX ${bill.aadhaarLast4}`:"-"}  |  PAN: ${bill.panLast4?`XXXXXX${bill.panLast4}`:"-"}`,42,footerY,{width:511});doc.end();
  const pdf=await done,printView=request.nextUrl.searchParams.get("print")==="1",safeName=String(bill.billNumber).replaceAll("/","-");return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`${printView?"inline":"attachment"}; filename="${safeName}.pdf"`,"Cache-Control":"private, no-store"}});
}
