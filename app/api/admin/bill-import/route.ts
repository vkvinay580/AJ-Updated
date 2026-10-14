import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { apiError, authenticated, cleanPhone, cleanText, requestIp } from "@/lib/api";
import { encryptSensitive, execute, one, stableHash, transaction } from "@/lib/db";

const columns = [
  "import_reference", "bill_date", "customer_name", "phone", "email", "address", "city", "state", "postal_code", "gstin", "state_code", "place_of_supply",
  "aadhaar", "pan", "transaction_type", "payment_method", "account_number", "ifsc_code", "upi_id", "cheque_number", "card_number",
  "description", "hsn_code", "purity", "metal", "gross_weight_grams", "stone_weight_grams", "rate_per_gram", "making_other", "cgst_rate", "sgst_rate", "adjustment", "notes",
] as const;
const requiredColumns = new Set<(typeof columns)[number]>([
  "import_reference", "customer_name", "phone", "aadhaar", "pan", "transaction_type", "payment_method",
  "account_number", "ifsc_code", "upi_id", "cheque_number", "card_number",
  "description", "hsn_code", "metal", "gross_weight_grams", "rate_per_gram",
]);
type ImportRow = Record<(typeof columns)[number], string> & { sourceRow: number };
type ImportBill = { reference:string; rows:ImportRow[]; errors:string[]; customerName:string; phone:string; transactionType:string; itemCount:number; total:number };
const textValue = (value: ExcelJS.CellValue) => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("text" in value) return String(value.text).trim();
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  }
  return String(value).trim();
};
const amount = (value:string) => Math.round(Number(value || 0) * 100);

function validate(rows: ImportRow[]) {
  const grouped = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const reference = cleanText(row.import_reference, 60);
    if (!reference) continue;
    grouped.set(reference, [...(grouped.get(reference) || []), row]);
  }
  const bills: ImportBill[] = [];
  for (const [reference, billRows] of grouped) {
    const first = billRows[0], errors:string[] = [];
    const phone = cleanPhone(first.phone), aadhaar = first.aadhaar.replace(/\D/g, ""), pan = first.pan.toUpperCase();
    if (cleanText(first.customer_name, 120).length < 2) errors.push("Customer name is required");
    if (phone.length !== 10) errors.push("Phone must contain 10 digits");
    if (!/^\d{12}$/.test(aadhaar) && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) errors.push("Enter a valid Aadhaar or PAN");
    if (first.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first.email)) errors.push("Email is invalid");
    if (first.bill_date && !/^\d{4}-\d{2}-\d{2}$/.test(first.bill_date)) errors.push("Bill date must be YYYY-MM-DD");
    if (!['sale','purchase'].includes(first.transaction_type.toLowerCase())) errors.push("Transaction type must be sale or purchase");
    const payment = first.payment_method.toLowerCase();
    if (!['cash','upi','bank_transfer','card','cheque'].includes(payment)) errors.push("Payment method is invalid");
    if (payment === 'bank_transfer' && (!/^[A-Za-z0-9-]{4,34}$/.test(first.account_number.replace(/\s/g,'')) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(first.ifsc_code.toUpperCase()))) errors.push("Bank account or IFSC is invalid");
    if (payment === 'upi' && !/^[\w.+-]{2,}@[A-Za-z0-9.-]{2,}$/.test(first.upi_id)) errors.push("UPI ID is invalid");
    if (payment === 'card' && !/^\d{12,19}$/.test(first.card_number.replace(/\D/g,''))) errors.push("Card number is invalid");
    if (payment === 'cheque' && !/^[A-Za-z0-9/-]{1,20}$/.test(first.cheque_number)) errors.push("Cheque number is invalid");
    let subtotal = 0;
    billRows.forEach((row) => {
      const gross=Number(row.gross_weight_grams), stone=Number(row.stone_weight_grams||0), rate=Number(row.rate_per_gram), making=Number(row.making_other||0);
      if (!cleanText(row.description,190)) errors.push(`Row ${row.sourceRow}: description is required`);
      if (!/^\d{4,8}$/.test(row.hsn_code)) errors.push(`Row ${row.sourceRow}: HSN code must contain 4–8 digits`);
      if (!['gold','silver'].includes(row.metal.toLowerCase())) errors.push(`Row ${row.sourceRow}: metal must be gold or silver`);
      if (!(gross > 0) || stone < 0 || stone >= gross || !(rate > 0) || making < 0) errors.push(`Row ${row.sourceRow}: check weights, rate and making amount`);
      subtotal += Math.round(((gross-stone)*rate+making)*100);
    });
    const cgst=first.transaction_type.toLowerCase()==='sale'?Number(first.cgst_rate||0):0, sgst=first.transaction_type.toLowerCase()==='sale'?Number(first.sgst_rate||0):0;
    if (![cgst,sgst].every(v=>Number.isFinite(v)&&v>=0&&v<=50)) errors.push("Tax rates must be between 0 and 50");
    const total=subtotal+Math.round(subtotal*cgst/100)+Math.round(subtotal*sgst/100)+amount(first.adjustment);
    if (total < 0 || !Number.isFinite(total)) errors.push("Bill total is invalid");
    bills.push({reference,rows:billRows,errors:[...new Set(errors)],customerName:first.customer_name,phone,transactionType:first.transaction_type.toLowerCase(),itemCount:billRows.length,total});
  }
  if (!bills.length) throw new Error("No bill rows were found. Fill import_reference in every row.");
  return bills;
}

async function nextInvoice(companyId:number, connection:PoolConnection) {
  const company=await one<RowDataPacket & {prefix:string}>("SELECT invoice_prefix AS prefix FROM companies WHERE id=? FOR UPDATE",[companyId],connection);
  if(!company) throw new Error("Company configuration not found.");
  const now=new Date(), year=now.getUTCMonth()>=3?now.getUTCFullYear():now.getUTCFullYear()-1;
  await execute("INSERT IGNORE INTO invoice_sequences (company_id,invoice_year,last_number) VALUES (?,?,0)",[companyId,year],connection);
  const sequence=await one<RowDataPacket & {lastNumber:number}>("SELECT last_number AS lastNumber FROM invoice_sequences WHERE company_id=? AND invoice_year=? FOR UPDATE",[companyId,year],connection);
  const next=Number(sequence?.lastNumber||0)+1;
  await execute("UPDATE invoice_sequences SET last_number=? WHERE company_id=? AND invoice_year=?",[next,companyId,year],connection);
  return `${company.prefix}/${String(year).slice(-2)}${String(year+1).slice(-2)}/${String(next).padStart(2,'0')}`;
}

export async function GET(request:NextRequest) {
  const {error,session}=await authenticated(request); if(error||!session)return error;
  const workbook=new ExcelJS.Workbook(), sheet=workbook.addWorksheet("Bills");
  sheet.columns=columns.map(key=>({header:key,key,width:Math.max(14,key.length+3)}));
  sheet.getRow(1).font={bold:false,color:{argb:"FFFFFFFF"}};
  columns.forEach((name,index)=>{sheet.getRow(1).getCell(index+1).font={bold:requiredColumns.has(name),color:{argb:"FFFFFFFF"}}});
  sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF9B6D13"}}; sheet.views=[{state:"frozen",ySplit:1}]; sheet.autoFilter={from:"A1",to:`${sheet.getColumn(columns.length).letter}1`};
  sheet.addRow({import_reference:"BILL-001",bill_date:new Date().toISOString().slice(0,10),customer_name:"Sample Customer",phone:"9876543210",email:"",aadhaar:"123412341234",pan:"",transaction_type:"sale",payment_method:"cash",description:"Gold Ornament",hsn_code:"711319",purity:"22K / 916",metal:"gold",gross_weight_grams:10,stone_weight_grams:0,rate_per_gram:7000,making_other:500,cgst_rate:1.5,sgst_rate:1.5,adjustment:0,notes:"Delete this sample row"});
  const instructions=workbook.addWorksheet("Instructions"); instructions.addRows([["Bill import instructions"],["One row equals one bill item. Use the same import_reference for multiple items on one bill."],["Required: reference, customer name, 10-digit phone, any one valid Aadhaar/PAN, transaction/payment details, description, HSN, metal, weights and rate."],["Customer photos and KYC document files are optional and are not included in this spreadsheet."],["Invoice numbers are generated automatically only after you verify and import."],["Dates use YYYY-MM-DD. Payment methods: cash, upi, bank_transfer, card, cheque."]]); instructions.getColumn(1).width=120;
  const buffer=await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="bill-import-template.xlsx"`}});
}

export async function POST(request:NextRequest) {
  const {error,session}=await authenticated(request); if(error||!session)return error;
  try {
    const contentType=request.headers.get("content-type")||""; let rawRows:ImportRow[]=[]; let action="preview";
    if(contentType.includes("multipart/form-data")){
      const form=await request.formData(), file=form.get("file"); if(!(file instanceof File)||!file.size)return apiError("Choose an Excel file."); if(file.size>5*1024*1024)return apiError("Excel file must be 5 MB or smaller.");
      const workbook=new ExcelJS.Workbook(), uploadBuffer=Buffer.from(await file.arrayBuffer()); await workbook.xlsx.load(uploadBuffer as never); const sheet=workbook.worksheets[0]; if(!sheet)return apiError("The workbook has no worksheet.");
      const headers=new Map<string,number>(); sheet.getRow(1).eachCell((cell,col)=>headers.set(textValue(cell.value).toLowerCase(),col));
      const missing=columns.filter(name=>!headers.has(name)); if(missing.length)return apiError(`Missing columns: ${missing.join(", ")}`);
      sheet.eachRow((row,rowNumber)=>{if(rowNumber===1)return; const data={} as ImportRow; columns.forEach(name=>data[name]=textValue(row.getCell(headers.get(name)!).value)); data.sourceRow=rowNumber; if(Object.values(data).some(Boolean))rawRows.push(data)});
    }else{const body=await request.json(); action=body.action; rawRows=Array.isArray(body.rows)?body.rows.map((source:Record<string,unknown>,index:number)=>{const row={} as ImportRow;columns.forEach(name=>row[name]=String(source?.[name]??"").trim());row.sourceRow=Number(source?.sourceRow)||index+2;return row}):[];}
    if(rawRows.length>1000)return apiError("A maximum of 1,000 spreadsheet rows can be imported at once.");
    const bills=validate(rawRows);
    if(action!=="import")return NextResponse.json({bills,rows:rawRows,valid:bills.every(b=>!b.errors.length)});
    if(bills.some(b=>b.errors.length))return apiError("Resolve all validation errors before importing.");
    const created=await transaction(async connection=>{
      const results:{billId:number;billNumber:string;reference:string}[]=[];
      for(const bill of bills){const first=bill.rows[0], phone=cleanPhone(first.phone); let customer=await one<RowDataPacket & {id:number}>("SELECT id FROM customers WHERE company_id=? AND phone=?",[session.companyId,phone],connection);
        if(!customer){const c=await execute(`INSERT INTO customers (company_id,phone,name,email,address,city,state,gstin,state_code,place_of_supply,postal_code,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[session.companyId,phone,cleanText(first.customer_name,120),cleanText(first.email,190)||null,cleanText(first.address,500)||null,cleanText(first.city,100)||null,cleanText(first.state,100)||null,cleanText(first.gstin,15).toUpperCase()||null,cleanText(first.state_code,2)||null,cleanText(first.place_of_supply,100)||cleanText(first.state,100)||null,cleanText(first.postal_code,10)||null,session.adminId],connection); customer={id:c.insertId} as RowDataPacket & {id:number};
          const aadhaar=first.aadhaar.replace(/\D/g,''), pan=first.pan.toUpperCase(), kind=/^\d{12}$/.test(aadhaar)?'aadhaar':'pan', number=kind==='aadhaar'?aadhaar:pan;
          await execute(`INSERT INTO kyc_records (customer_id,company_id,document_type,number_encrypted,number_hash,number_last4,created_by) VALUES (?,?,?,?,?,?,?)`,[customer.id,session.companyId,kind,encryptSensitive(number),stableHash(number),number.slice(-4),session.adminId],connection);
        }
        const subtotal=bill.rows.reduce((sum,row)=>sum+Math.round(((Number(row.gross_weight_grams)-Number(row.stone_weight_grams||0))*Number(row.rate_per_gram)+Number(row.making_other||0))*100),0), type=first.transaction_type.toLowerCase()==='purchase'?'purchase':'sale', cgst=type==='sale'?Number(first.cgst_rate||0):0, sgst=type==='sale'?Number(first.sgst_rate||0):0, cgstPaise=Math.round(subtotal*cgst/100), sgstPaise=Math.round(subtotal*sgst/100), adjustment=amount(first.adjustment), total=subtotal+cgstPaise+sgstPaise+adjustment, payment=first.payment_method.toLowerCase(), billNumber=await nextInvoice(session.companyId,connection);
        const result=await execute(`INSERT INTO bills (company_id,customer_id,bill_number,transaction_type,bill_date,subtotal_paise,tax_paise,cgst_paise,sgst_paise,cgst_rate_bps,sgst_rate_bps,adjustment_paise,total_paise,payment_method,account_number,ifsc_code,upi_id,cheque_number,card_number,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[session.companyId,customer.id,billNumber,type,first.bill_date||new Date().toISOString().slice(0,10),subtotal,cgstPaise+sgstPaise,cgstPaise,sgstPaise,Math.round(cgst*100),Math.round(sgst*100),adjustment,total,payment,payment==='bank_transfer'?encryptSensitive(first.account_number.replace(/\s/g,'')):null,payment==='bank_transfer'?first.ifsc_code.toUpperCase():null,payment==='upi'?first.upi_id:null,payment==='cheque'?first.cheque_number:null,payment==='card'?encryptSensitive(first.card_number.replace(/\D/g,'')):null,cleanText(first.notes,500)||null,session.adminId],connection);
        for(const row of bill.rows){const gross=Math.round(Number(row.gross_weight_grams)*1000),stone=Math.round(Number(row.stone_weight_grams||0)*1000),rate=amount(row.rate_per_gram),making=amount(row.making_other),line=Math.round((gross-stone)/1000*rate+making);await execute(`INSERT INTO bill_items (bill_id,description,hsn_code,purity,metal,gross_weight_mg,stone_weight_mg,weight_mg,rate_paise_per_gram,making_paise,amount_paise) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[result.insertId,cleanText(row.description,190),row.hsn_code,cleanText(row.purity,30)||null,row.metal.toLowerCase(),gross,stone,gross-stone,rate,making,line],connection)}
        await execute("INSERT INTO audit_logs (admin_id,company_id,action,entity_type,entity_id,ip_address) VALUES (?,?, 'bill_imported','bill',?,?)",[session.adminId,session.companyId,result.insertId,requestIp(request)],connection); results.push({billId:result.insertId,billNumber,reference:bill.reference});
      } return results;
    }); return NextResponse.json({created},{status:201});
  }catch(caught){const message=caught instanceof Error?caught.message:"Unable to import bills."; if(message.includes("Duplicate entry"))return apiError("A phone, Aadhaar or PAN in this file is already assigned to another customer.",409); return apiError(message,400)}
}
