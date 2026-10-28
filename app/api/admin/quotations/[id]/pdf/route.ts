import { existsSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { getCompanyInvoiceProfile, getCompanySeal } from "@/lib/company-invoice";
import { one, rows } from "@/lib/db";

const inr = (paise: number) => `INR ${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function underThousand(value: number) { let text = ""; if (value >= 100) { text += `${ones[Math.floor(value / 100)]} Hundred `; value %= 100; } if (value >= 20) text += `${tens[Math.floor(value / 10)]} ${ones[value % 10]} `; else text += `${ones[value]} `; return text.trim(); }
function numberWords(value: number) { let number = Math.floor(Math.abs(value)); if (!number) return "Zero"; const parts: string[] = []; for (const [size, label] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]] as Array<[number, string]>) { if (number >= size) { parts.push(`${underThousand(Math.floor(number / size))} ${label}`); number %= size; } } if (number) parts.push(underThousand(number)); return parts.join(" "); }
function amountWords(paise: number) { const rupees = Math.floor(Number(paise) / 100), fraction = Math.abs(Number(paise)) % 100; return `INR ${numberWords(rupees)}${fraction ? ` and ${numberWords(fraction)} Paise` : ""} Only`; }

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid quotation.");
  const quotation = await one<RowDataPacket>(`SELECT q.quotation_number AS quotationNumber,q.business_mode AS businessMode,
    q.total_weight_mg AS totalWeightMg,q.total_paise AS totalPaise,q.pledge_amount_paise AS pledgeAmountPaise,
    q.notes,q.origin_branch_id AS originBranchId,q.created_by_employee_id AS createdByEmployeeId,q.created_at AS createdAt,
    c.name AS customerName,c.phone AS customerPhone,c.email AS customerEmail,c.address AS customerAddress,c.city AS customerCity,
    c.state AS customerState,c.postal_code AS customerPostalCode,c.gstin AS customerGstin,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='aadhaar' LIMIT 1) AS aadhaarLast4,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='pan' LIMIT 1) AS panLast4
    FROM quotations q JOIN customers c ON c.id=q.customer_id AND c.company_id=q.company_id
    WHERE q.id=? AND q.company_id=? AND (? IS NULL OR q.origin_branch_id=?)`, [id, actor.companyId, actor.branchId, actor.branchId]);
  if (!quotation) return apiError("Quotation not found.", 404);
  const items = await rows<RowDataPacket>(`SELECT description,purity,gross_weight_mg AS grossWeightMg,stone_weight_mg AS stoneWeightMg,
    wastage_weight_mg AS wastageWeightMg,weight_mg AS weightMg,rate_paise_per_gram AS ratePaisePerGram,amount_paise AS amountPaise
    FROM quotation_items WHERE quotation_id=? ORDER BY id`, [id]);
  const totalGrossWeightMg = items.reduce((sum, item) => sum + Number(item.grossWeightMg || item.weightMg || 0), 0);
  const totalStoneWeightMg = items.reduce((sum, item) => sum + Number(item.stoneWeightMg || 0), 0);
  const totalWastageWeightMg = items.reduce((sum, item) => sum + Number(item.wastageWeightMg || 0), 0);
  const totalNetWeightMg = items.reduce((sum, item) => sum + Number(item.weightMg || 0), 0);
  const isPledged = quotation.businessMode === "pledged";
  const pledgeAmountPaise = isPledged ? Number(quotation.pledgeAmountPaise || 0) : 0;
  const balanceAfterPledgePaise = Number(quotation.totalPaise) - pledgeAmountPaise;
  const profile = getCompanyInvoiceProfile(actor.companySlug);
  const createdAt = new Date(quotation.createdAt);
  const quoteDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(createdAt);
  const quoteTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(createdAt);
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: String(quotation.quotationNumber), Subject: `${isPledged ? "Pledged" : "Walk-in sale"} gold quotation` } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(chunk));
  const done = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const gold = "#9e711b", ink = "#202833", muted = "#69737f", line = "#d7dce1";
  doc.font("Helvetica-Bold").fontSize(7).fillColor(ink).text(isPledged ? "PLEDGED GOLD QUOTATION" : "WALK-IN SALE GOLD QUOTATION", { align: "center" });
  const top = doc.y + 5;
  const publicRoot = path.resolve(process.cwd(), "public");
  const logoPath = path.resolve(publicRoot, String(actor.companyLogo).replace(/^[/\\]+/, ""));
  const showLogo = logoPath.startsWith(`${publicRoot}${path.sep}`) && existsSync(logoPath);
  if (showLogo) { try { doc.image(logoPath, 42, top, { fit: [50, 50], align: "center", valign: "center" }); } catch {} }
  const companyX = showLogo ? 100 : 42;
  doc.font("Helvetica-Bold").fontSize(17).fillColor(gold).text(actor.companyName, companyX, top, { width: 265 });
  doc.font("Helvetica").fontSize(6.5).fillColor(ink).text(profile.address, companyX, top + 20, { width: 270, height: 17, ellipsis: true });
  doc.font("Helvetica-Bold").text(`GSTIN/UIN: ${profile.gstin}${profile.pan ? `  |  PAN: ${profile.pan}` : ""}`, companyX, top + 39);
  doc.font("Helvetica").text(`Contact: ${profile.phone}`, companyX, top + 49);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(gold).text("QUOTATION", 375, top + 2, { width: 178, align: "right" });
  doc.fontSize(7).fillColor(ink).text(String(quotation.quotationNumber), 375, top + 22, { width: 178, align: "right" });
  doc.font("Helvetica").text(`${quoteDate} · ${quoteTime} IST`, 375, top + 35, { width: 178, align: "right" });
  doc.y = top + 62; doc.lineWidth(2).strokeColor(gold).moveTo(42, doc.y).lineTo(553, doc.y).stroke(); doc.lineWidth(1);
  const partyY = doc.y + 7, partyH = 69;
  doc.strokeColor(line).rect(42, partyY, 511, partyH).stroke().moveTo(374, partyY).lineTo(374, partyY + partyH).stroke();
  doc.font("Helvetica-Bold").fontSize(5.5).fillColor(gold).text("QUOTATION FOR", 49, partyY + 6);
  doc.fontSize(9).fillColor(ink).text(String(quotation.customerName), 49, partyY + 17, { width: 310 });
  doc.font("Helvetica").fontSize(6.5).text([quotation.customerAddress, quotation.customerCity, quotation.customerState, quotation.customerPostalCode].filter(Boolean).join(", ") || "Address not provided", 49, partyY + 30, { width: 310, height: 10, ellipsis: true });
  doc.text(`Contact: +91 ${quotation.customerPhone}${quotation.customerEmail ? `  |  ${quotation.customerEmail}` : ""}`, 49, partyY + 43, { width: 310 });
  doc.text(`Aadhaar: ${quotation.aadhaarLast4 ? `XXXX XXXX ${quotation.aadhaarLast4}` : "-"}  |  PAN: ${quotation.panLast4 ? `XXXXXX${quotation.panLast4}` : "-"}${quotation.customerGstin ? `  |  GSTIN: ${quotation.customerGstin}` : ""}`, 49, partyY + 55, { width: 310 });
  doc.font("Helvetica-Bold").fontSize(5.5).fillColor(gold).text("QUOTATION DETAILS", 381, partyY + 7);
  doc.font("Helvetica").fontSize(6.5).fillColor(ink).text(`Type: ${isPledged ? "Pledged" : "Walk-in Sale"}`, 381, partyY + 20).text(`Issued: ${quoteDate}`, 381, partyY + 35).text(`Time: ${quoteTime} IST`, 381, partyY + 49);
  doc.y = partyY + partyH + 10;
  const columns = [
    { x: 42, width: 20, align: "left" as const }, { x: 62, width: 113, align: "left" as const }, { x: 175, width: 50, align: "left" as const },
    { x: 225, width: 58, align: "right" as const }, { x: 283, width: 79, align: "right" as const }, { x: 362, width: 58, align: "right" as const },
    { x: 420, width: 62, align: "right" as const }, { x: 482, width: 71, align: "right" as const },
  ];
  const cell = (value: string, column: number, y: number) => doc.text(value, columns[column].x, y, { width: columns[column].width, align: columns[column].align, lineBreak: false });
  const headerY = doc.y;
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ink);
  ["#", "Ornament", "Purity", "Gross", "Stone / waste", "Net", "Rate / g", "Value"].forEach((value, index) => cell(value, index, headerY));
  doc.y = headerY + 16; doc.strokeColor(line).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  doc.font("Helvetica").fontSize(6.5);
  items.forEach((item, index) => {
    const y = doc.y + 7;
    [String(index + 1), String(item.description), String(item.purity), `${(Number(item.grossWeightMg || item.weightMg) / 1000).toFixed(3)} g`,
      `S ${(Number(item.stoneWeightMg || 0) / 1000).toFixed(3)} / W ${(Number(item.wastageWeightMg || 0) / 1000).toFixed(3)}`,
      `${(Number(item.weightMg) / 1000).toFixed(3)} g`, inr(item.ratePaisePerGram), inr(item.amountPaise)].forEach((value, column) => cell(value, column, y));
    doc.y = y + 20; doc.strokeColor("#edf0f2").moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  });
  const totalY = doc.y + 10;
  if (quotation.notes) doc.font("Helvetica-Bold").fontSize(6).fillColor(gold).text("NOTES", 42, totalY).font("Helvetica").fontSize(7).fillColor(ink).text(String(quotation.notes), 42, totalY + 12, { width: 255, height: 48, ellipsis: true });
  const summaryLabelX = 323, summaryValueX = 455;
  doc.font("Helvetica").fontSize(7).fillColor(ink)
    .text("Gross weight", summaryLabelX, totalY, { width: 122, align: "right" }).text(`${(totalGrossWeightMg / 1000).toFixed(3)} g`, summaryValueX, totalY, { width: 98, align: "right" })
    .text("Stone deduction", summaryLabelX, totalY + 12, { width: 122, align: "right" }).text(`${(totalStoneWeightMg / 1000).toFixed(3)} g`, summaryValueX, totalY + 12, { width: 98, align: "right" })
    .text("Wastage deduction", summaryLabelX, totalY + 24, { width: 122, align: "right" }).text(`${(totalWastageWeightMg / 1000).toFixed(3)} g`, summaryValueX, totalY + 24, { width: 98, align: "right" });
  doc.font("Helvetica-Bold").fontSize(8).text("Net gold weight", summaryLabelX, totalY + 37, { width: 122, align: "right" }).text(`${(totalNetWeightMg / 1000).toFixed(3)} g`, summaryValueX, totalY + 37, { width: 98, align: "right" });
  doc.font("Helvetica-Bold").fontSize(10).fillColor(gold).text("QUOTED VALUE", summaryLabelX, totalY + 54, { width: 122, align: "right" }).fontSize(11).text(inr(quotation.totalPaise), summaryValueX, totalY + 54, { width: 98, align: "right" });
  if (isPledged) {
    doc.font("Helvetica-Bold").fontSize(7).fillColor(ink).text("Pledge amount", summaryLabelX, totalY + 72, { width: 122, align: "right" }).text(inr(pledgeAmountPaise), summaryValueX, totalY + 72, { width: 98, align: "right" });
    doc.fontSize(8).fillColor(gold).text("EST. BALANCE", summaryLabelX, totalY + 87, { width: 122, align: "right" }).text(inr(balanceAfterPledgePaise), summaryValueX, totalY + 87, { width: 98, align: "right" });
  }
  doc.y = totalY + (isPledged ? 112 : 82);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ink).text(`Amount (in words): ${amountWords(quotation.totalPaise)}`, 42, doc.y, { width: 511 });
  doc.y += 22;
  const termsY = doc.y;
  doc.roundedRect(42, termsY, 511, 73, 5).fillAndStroke("#fbf7ee", "#e3cf9e");
  doc.font("Helvetica-Bold").fontSize(7).fillColor(gold).text("IMPORTANT QUOTATION TERMS", 53, termsY + 11, { width: 489 });
  doc.font("Helvetica").fontSize(6.5).fillColor(ink).text(`This quotation is indicative and is valid only until the branch closing time or 11:59 PM IST on ${quoteDate}, whichever occurs first. Final value is subject to physical verification of weight, purity, stones, and deductions. The item rates shown apply only to this quotation and do not change Head Office master rates.`, 53, termsY + 25, { width: 489, align: "justify" });
  doc.font("Helvetica-Bold").text("Aryan Gold Pvt. Ltd. reserves the right to revise or revoke this quotation without prior notice.", 53, termsY + 55, { width: 489, align: "center" });
  doc.y = termsY + 91;
  const sealPath = path.join(process.cwd(), "public", getCompanySeal(actor.companySlug));
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(gold).text(`FOR ${actor.companyName.toUpperCase()}`, 373, doc.y, { width: 180, align: "center" });
  if (existsSync(sealPath)) { try { doc.image(sealPath, 408, doc.y + 10, { fit: [110, 50], align: "center", valign: "center" }); } catch {} }
  doc.strokeColor(muted).moveTo(373, doc.y + 65).lineTo(553, doc.y + 65).stroke();
  doc.font("Helvetica").fontSize(6).fillColor(muted).text("Authorised Signatory", 373, doc.y + 70, { width: 180, align: "center" });
  doc.end();
  const pdf = await done;
  const inline = request.nextUrl.searchParams.get("view") === "1" || request.nextUrl.searchParams.get("print") === "1";
  const safeName = String(quotation.quotationNumber).replaceAll("/", "-");
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}.pdf"`, "Cache-Control": "private, no-store" } });
}
