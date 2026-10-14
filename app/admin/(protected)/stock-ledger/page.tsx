import type { RowDataPacket } from "mysql2";
import { requireSession } from "@/lib/auth";
import { rows } from "@/lib/db";
import StockAdjustmentForm from "@/components/admin/StockAdjustmentForm";

const grams = (mg:number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(mg/1000)} g`;
type Entry = RowDataPacket & { id:string; date:string; metal:string; movement:string; weightMg:number; reference:string; notes:string|null };

export default async function StockLedgerPage() {
  const session = await requireSession();
  const entries = await rows<Entry>(`SELECT * FROM (
    SELECT CONCAT('bill-',bi.id) id, DATE_FORMAT(b.created_at,'%Y-%m-%d %H:%i') date, bi.metal,
      IF(b.transaction_type='purchase','add','remove') movement, bi.weight_mg weightMg, b.bill_number reference, bi.description notes, b.created_at sortDate
    FROM bill_items bi JOIN bills b ON b.id=bi.bill_id WHERE b.company_id=?
    UNION ALL
    SELECT CONCAT('adjustment-',sa.id), DATE_FORMAT(sa.created_at,'%Y-%m-%d %H:%i'), sa.metal, sa.movement, sa.weight_mg,
      'Manual adjustment', sa.notes, sa.created_at FROM stock_adjustments sa WHERE sa.company_id=?
  ) ledger ORDER BY sortDate DESC LIMIT 300`, [session.companyId, session.companyId]);
  return <div className="admin-page"><div className="page-title"><div><p>Inventory</p><h1>Stock ledger</h1><span>Gold and silver purchases, sales, and manual adjustments.</span></div></div>
    <section className="panel form-panel"><div className="panel-heading"><div><h2>Add or remove stock</h2><p>Every manual change is recorded permanently in this ledger.</p></div></div><StockAdjustmentForm/></section>
    <section className="panel"><div className="panel-heading"><div><h2>Ledger entries</h2><p>Newest movements first</p></div></div><div className="responsive-table"><table><thead><tr><th>Date</th><th>Metal</th><th>Movement</th><th>Reference</th><th>Notes</th><th className="right">Weight</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.date}</td><td className="strong" style={{textTransform:"capitalize"}}>{entry.metal}</td><td><span className={`status ${entry.movement==='add'?'purchase':'sale'}`}>{entry.movement}</span></td><td>{entry.reference}</td><td>{entry.notes || '—'}</td><td className="right strong">{entry.movement==='add'?'+':'−'}{grams(Number(entry.weightMg))}</td></tr>)}</tbody></table>{!entries.length&&<div className="empty-inline"><h3>No stock movements yet</h3><p>Bills and manual adjustments will appear here.</p></div>}</div></section>
  </div>;
}
