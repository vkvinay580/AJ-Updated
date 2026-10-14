import { ArrowLeft, FileText, Flame, MapPin, PackageCheck, Scale } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { one, rows } from "@/lib/db";

const grams = (mg: unknown) => `${(Number(mg || 0) / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;
const money = (paise: unknown) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100);

export default async function GattiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const group = await one<RowDataPacket>(`SELECT mg.id,mg.gatti_id AS gattiId,DATE_FORMAT(mg.melt_date,'%Y-%m-%d') AS meltDate,mg.status,
    mg.audited_total_weight_mg AS auditedTotalWeightMg,mg.input_weight_mg AS inputWeightMg,mg.output_gatti_weight_mg AS outputWeightMg,
    mg.matti_weight_mg AS mattiWeightMg,mg.purity,mg.notes,mg.melter_notes AS melterNotes,mg.created_at AS createdAt,
    mg.completed_at AS completedAt,creator.name AS createdBy,melter.name AS completedBy FROM melt_groups mg
    JOIN head_office_users creator ON creator.id=mg.created_by LEFT JOIN head_office_users melter ON melter.id=mg.completed_by WHERE mg.id=?`, [id]);
  if (!group) notFound();
  const items = await rows<RowDataPacket>(`SELECT ti.transfer_id AS transferId,gt.branch_id AS branchId,gt.tare_weight_mg AS tareWeightMg,gt.bm_name AS bmName,gt.bm_phone AS bmPhone,gt.created_by_employee_id AS sentBy,gt.created_at AS sentAt,
    t.id AS transactionId,t.business_mode AS businessMode,b.id AS billId,b.bill_number AS billNumber,DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS billDate,
    b.transaction_type AS transactionType,b.subtotal_paise AS subtotalPaise,b.tax_paise AS taxPaise,b.cgst_paise AS cgstPaise,b.sgst_paise AS sgstPaise,
    b.adjustment_paise AS adjustmentPaise,b.total_paise AS totalPaise,b.payment_method AS paymentMethod,b.notes AS billNotes,
    c.name AS customerName,c.phone AS customerPhone,c.email AS customerEmail,c.address AS customerAddress,c.city AS customerCity,
    c.state AS customerState,c.postal_code AS postalCode,c.gstin,bi.id AS billItemId,bi.description,bi.item_description AS itemDescription,
    bi.hsn_code AS hsnCode,bi.purity,bi.gross_weight_mg AS grossWeightMg,bi.stone_weight_mg AS stoneWeightMg,bi.weight_mg AS netWeightMg,
    bi.rate_paise_per_gram AS ratePaise,bi.making_paise AS makingPaise,bi.amount_paise AS itemAmountPaise,
    ti.sent_weight_mg AS sentWeightMg,mgi.audited_weight_mg AS auditedWeightMg,a.notes AS auditNotes,a.audited_at AS auditedAt,auditor.name AS auditorName
    FROM melt_group_items mgi JOIN branch_gold_transfer_items ti ON ti.id=mgi.transfer_item_id
    JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id JOIN branch_transactions t ON t.id=ti.transaction_id
    JOIN bills b ON b.id=ti.bill_id JOIN customers c ON c.id=b.customer_id JOIN bill_items bi ON bi.id=ti.bill_item_id
    JOIN head_office_ornament_audits a ON a.transfer_item_id=ti.id JOIN head_office_users auditor ON auditor.id=a.audited_by
    WHERE mgi.melt_group_id=? ORDER BY gt.branch_id,b.bill_date,b.id,bi.id`, [id]);
  return <div className="admin-page gatti-detail-page"><div className="page-title"><div><Link href="/admin/melting-report" className="back-link"><ArrowLeft/> Melting report</Link><p>GATTI TRACEABILITY</p><h1>{group.gattiId}</h1><span>{group.meltDate} · Created by {group.createdBy}</span></div><span className={`melting-status large ${group.status}`}>{group.status}</span></div>
    <div className="gatti-summary"><article><Scale/><span><small>Audited ornament total</small><strong>{grams(group.auditedTotalWeightMg)}</strong></span></article><article><Flame/><span><small>Weight given for melting</small><strong>{group.inputWeightMg == null ? "Awaiting melter" : grams(group.inputWeightMg)}</strong></span></article><article><Flame/><span><small>Output Gatti weight</small><strong>{group.outputWeightMg == null ? "—" : grams(group.outputWeightMg)}</strong></span></article><article><Scale/><span><small>Matti received</small><strong>{group.mattiWeightMg == null ? "—" : grams(group.mattiWeightMg)}</strong></span></article><article><strong>{group.purity ? `${Number(group.purity).toFixed(3)}%` : "—"}</strong><span><small>Final purity</small><em>{group.completedBy ? `Recorded by ${group.completedBy}` : "Not completed"}</em></span></article></div>
    {(group.notes || group.melterNotes) && <section className="panel gatti-notes"><div><small>Auditor note</small><p>{group.notes || "—"}</p></div><div><small>Melter note</small><p>{group.melterNotes || "—"}</p></div></section>}
    <section className="panel"><div className="panel-heading"><div><h2>Ornaments and complete bill details</h2><p>Every input is linked to its branch packet, customer, invoice, and audited weight.</p></div><span>{items.length} ornaments</span></div><div className="gatti-items">{items.map((item, index) => <article key={Number(item.billItemId)} className="gatti-item"><header><div><span>{index + 1}</span><div><small>ORNAMENT</small><h3>{item.itemDescription || item.description}</h3><p>{item.description} · HSN {item.hsnCode || "—"} · Purity {item.purity || "—"}</p></div></div><Link href={`/admin/bills/${item.billId}`}><FileText/> Open full invoice</Link></header>
      <div className="gatti-detail-grid"><section><h4><MapPin/> Branch & dispatch</h4><dl><div><dt>Branch</dt><dd>{item.branchId}</dd></div><div><dt>Dispatch</dt><dd>#{item.transferId}</dd></div><div><dt>Source packet</dt><dd>#{item.transactionId}</dd></div><div><dt>Combined tare</dt><dd>{grams(item.tareWeightMg)}</dd></div><div><dt>BM name</dt><dd>{item.bmName||"—"}</dd></div><div><dt>BM phone</dt><dd>{item.bmPhone||"—"}</dd></div><div><dt>Sent by</dt><dd>{item.sentBy}</dd></div><div><dt>Sent at</dt><dd>{new Date(String(item.sentAt)).toLocaleString("en-IN")}</dd></div></dl></section><section><h4><FileText/> Bill</h4><dl><div><dt>Bill no.</dt><dd>{item.billNumber}</dd></div><div><dt>Bill date</dt><dd>{item.billDate}</dd></div><div><dt>Type</dt><dd>{item.transactionType}</dd></div><div><dt>Business mode</dt><dd>{item.businessMode}</dd></div><div><dt>Payment</dt><dd>{String(item.paymentMethod).replaceAll("_", " ")}</dd></div><div><dt>Bill total</dt><dd>{money(item.totalPaise)}</dd></div></dl></section><section><h4><PackageCheck/> Customer</h4><dl><div><dt>Name</dt><dd>{item.customerName}</dd></div><div><dt>Phone</dt><dd>{item.customerPhone}</dd></div><div><dt>Email</dt><dd>{item.customerEmail || "—"}</dd></div><div className="full"><dt>Address</dt><dd>{[item.customerAddress,item.customerCity,item.customerState,item.postalCode].filter(Boolean).join(", ") || "—"}</dd></div><div><dt>GSTIN</dt><dd>{item.gstin || "—"}</dd></div></dl></section><section><h4><Scale/> Weight & value</h4><dl><div><dt>Gross weight</dt><dd>{grams(item.grossWeightMg)}</dd></div><div><dt>Stone weight</dt><dd>{grams(item.stoneWeightMg)}</dd></div><div><dt>Net / sent weight</dt><dd>{grams(item.sentWeightMg)}</dd></div><div><dt>Audited weight</dt><dd><strong>{grams(item.auditedWeightMg)}</strong></dd></div><div><dt>Rate / gram</dt><dd>{money(item.ratePaise)}</dd></div><div><dt>Making / other</dt><dd>{money(item.makingPaise)}</dd></div><div><dt>Item amount</dt><dd>{money(item.itemAmountPaise)}</dd></div><div><dt>Audited by</dt><dd>{item.auditorName}</dd></div></dl></section></div>
      <footer><span>Subtotal <b>{money(item.subtotalPaise)}</b></span><span>CGST <b>{money(item.cgstPaise)}</b></span><span>SGST <b>{money(item.sgstPaise)}</b></span><span>Tax <b>{money(item.taxPaise)}</b></span><span>Adjustment <b>{money(item.adjustmentPaise)}</b></span><span>Bill total <b>{money(item.totalPaise)}</b></span></footer>
    </article>)}</div></section>
  </div>;
}
