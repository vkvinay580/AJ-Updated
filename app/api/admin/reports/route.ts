import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { authenticated, requestIp } from "@/lib/api";
import { execute, rows } from "@/lib/db";

type ReportRow = RowDataPacket & {
  billNumber: string; billDate: string; transactionType: string; customerName: string;
  customerPhone: string; paymentMethod: string; subtotalPaise: number; taxPaise: number;
  adjustmentPaise: number; totalPaise: number; itemCount: number; totalWeightMg: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const rupees = (paise: number) => Number(paise) / 100;
const displayMoney = (paise: number) => `INR ${rupees(paise).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function validDate(value: string | null) {
  if (!value || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function pdfBuffer(companyName: string, start: string, end: string, reportRows: ReportRow[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 32 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(20).fillColor("#8b6417").text(companyName, { align: "center" });
    doc.fontSize(13).fillColor("#222").text("Bill Register Report", { align: "center" });
    doc.fontSize(9).fillColor("#666").text(`${start} to ${end}`, { align: "center" }).moveDown(1.2);
    const columns = [32, 132, 195, 280, 400, 475, 555, 650];
    const widths = [95, 58, 80, 115, 70, 75, 90, 90];
    const headers = ["Bill No.", "Date", "Type", "Customer", "Payment", "Weight (g)", "Subtotal", "Total"];
    const drawRow = (values: string[], y: number, header = false) => {
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(header ? 8 : 7).fillColor(header ? "#fff" : "#222");
      if (header) doc.rect(28, y - 4, 770, 18).fill("#9b711d");
      values.forEach((value, index) => doc.fillColor(header ? "#fff" : "#222").text(value, columns[index], y, { width: widths[index], ellipsis: true }));
    };
    let y = doc.y;
    drawRow(headers, y, true); y += 20;
    for (const row of reportRows) {
      if (y > 530) { doc.addPage(); y = 36; drawRow(headers, y, true); y += 20; }
      drawRow([row.billNumber, row.billDate, row.transactionType, row.customerName, row.paymentMethod.replaceAll("_", " "), (Number(row.totalWeightMg) / 1000).toFixed(3), displayMoney(row.subtotalPaise), displayMoney(row.totalPaise)], y);
      doc.moveTo(28, y + 12).lineTo(798, y + 12).strokeColor("#ddd").stroke(); y += 18;
    }
    const grandTotal = reportRows.reduce((sum, row) => sum + Number(row.totalPaise), 0);
    doc.moveDown().font("Helvetica-Bold").fontSize(10).fillColor("#222").text(`Bills: ${reportRows.length}     Grand total: ${displayMoney(grandTotal)}`, 32, Math.min(y + 8, 545), { align: "right", width: 760 });
    doc.end();
  });
}

export async function GET(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const format = request.nextUrl.searchParams.get("format");
  if (!validDate(start) || !validDate(end) || start! > end!) return NextResponse.json({ error: "Select a valid date range." }, { status: 400 });
  if (format !== "xlsx" && format !== "pdf") return NextResponse.json({ error: "Choose Excel or PDF format." }, { status: 400 });

  const reportRows = await rows<ReportRow>(`SELECT b.bill_number AS billNumber, DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS billDate,
    b.transaction_type AS transactionType, c.name AS customerName, c.phone AS customerPhone,
    b.payment_method AS paymentMethod, b.subtotal_paise AS subtotalPaise, b.tax_paise AS taxPaise,
    b.adjustment_paise AS adjustmentPaise, b.total_paise AS totalPaise, COUNT(bi.id) AS itemCount,
    COALESCE(SUM(bi.weight_mg), 0) AS totalWeightMg
    FROM bills b JOIN customers c ON c.id = b.customer_id AND c.company_id = b.company_id
    LEFT JOIN bill_items bi ON bi.bill_id = b.id
    WHERE b.company_id = ? AND b.bill_date BETWEEN ? AND ? GROUP BY b.id ORDER BY b.bill_date, b.id`, [session.companyId, start!, end!]);
  const filename = `${session.companySlug}-bill-register-${start}-to-${end}.${format}`;
  await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, ip_address) VALUES (?, ?, ?, 'report', ?)", [session.adminId, session.companyId, `report_${format}_downloaded`, requestIp(request)]);

  if (format === "pdf") {
    const buffer = await pdfBuffer(session.companyName, start!, end!, reportRows);
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = session.companyName;
  const sheet = workbook.addWorksheet("Bill Register", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:L1"); sheet.getCell("A1").value = session.companyName; sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF9B711D" } };
  sheet.mergeCells("A2:L2"); sheet.getCell("A2").value = `Bill Register: ${start} to ${end}`;
  sheet.columns = [{ width: 19 }, { width: 13 }, { width: 13 }, { width: 25 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 16 }];
  const header = sheet.addRow(["Bill Number", "Date", "Type", "Customer", "Phone", "Payment", "Items", "Weight (g)", "Subtotal", "Tax", "Adjustment", "Total"]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9B711D" } };
  reportRows.forEach((row) => sheet.addRow([row.billNumber, row.billDate, row.transactionType, row.customerName, row.customerPhone, row.paymentMethod.replaceAll("_", " "), Number(row.itemCount), Number(row.totalWeightMg) / 1000, rupees(row.subtotalPaise), rupees(row.taxPaise), rupees(row.adjustmentPaise), rupees(row.totalPaise)]));
  [9, 10, 11, 12].forEach((column) => { sheet.getColumn(column).numFmt = '₹#,##0.00'; });
  sheet.autoFilter = { from: "A4", to: "L4" };
  const totalRow = sheet.addRow(["TOTAL", "", "", "", "", "", reportRows.reduce((sum, row) => sum + Number(row.itemCount), 0), reportRows.reduce((sum, row) => sum + Number(row.totalWeightMg), 0) / 1000, rupees(reportRows.reduce((sum, row) => sum + Number(row.subtotalPaise), 0)), rupees(reportRows.reduce((sum, row) => sum + Number(row.taxPaise), 0)), rupees(reportRows.reduce((sum, row) => sum + Number(row.adjustmentPaise), 0)), rupees(reportRows.reduce((sum, row) => sum + Number(row.totalPaise), 0))]);
  totalRow.font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"` } });
}
