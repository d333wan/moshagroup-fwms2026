import type { ReactNode } from "react";
import {
  COMPANY_ADDRESS,
  COMPANY_LOGO_URL,
  COMPANY_NAME,
} from "@/lib/company";

/**
 * Shared print/PDF styling for FWMS reports.
 * On screen: white A4-like page centered on gray background.
 * In print: full A4 portrait, professional typography, running header/footer.
 */
export function PrintStyles({ landscape = false }: { landscape?: boolean }) {
  return (
    <style>{`
      /* --- On-screen preview (looks like a paged document) --- */
      .print-doc {
        color: #1F2937;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 15px;
        line-height: 1.7;
      }
      .print-doc h1, .print-doc h2, .print-doc h3 { color: #111827; letter-spacing: -0.01em; }
      .print-doc .p-title { font-size: 22px; font-weight: 700; color: #111827; }
      .print-doc .p-muted { color: #4B5563; }
      .print-doc .p-caption { color: #6B7280; font-size: 12px; }

      .print-page {
        background: #ffffff;
        border: 1px solid #E5E7EB;
        box-shadow: 0 10px 30px -12px rgba(15,23,42,0.15);
        margin: 0 auto 24px;
        padding: 18mm 16mm;
        max-width: ${landscape ? "297mm" : "210mm"};
        min-height: ${landscape ? "210mm" : "297mm"};
        border-radius: 6px;
      }

      .print-card {
        background: #ffffff;
        border: 1.5px solid #D1D5DB;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 6px -2px rgba(15,23,42,0.08);
      }

      .print-doc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        background: linear-gradient(90deg, #1E3A8A 0%, #2563EB 100%);
        color: #ffffff;
        margin-bottom: 18px;
      }
      .print-doc-header .brand { display: flex; align-items: center; gap: 12px; }
      .print-doc-header .brand img { height: 44px; width: auto; background: #fff; border-radius: 6px; padding: 4px; }
      .print-doc-header .brand .name { font-weight: 700; font-size: 14px; line-height: 1.2; }
      .print-doc-header .brand .addr { font-size: 11px; opacity: 0.9; line-height: 1.35; max-width: 320px; }
      .print-doc-header .meta { text-align: right; font-size: 11px; opacity: 0.95; }
      .print-doc-header .meta .t { font-weight: 700; font-size: 13px; }

      .print-doc-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        padding-top: 10px;
        border-top: 1px solid #E5E7EB;
        color: #6B7280;
        font-size: 11px;
      }

      /* Status badges */
      .status-badge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 10px; border-radius: 999px;
        font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
        border: 1px solid transparent;
      }
      .status-completed { background: #DCFCE7; color: #14532D; border-color: #86EFAC; }
      .status-in_progress, .status-progress { background: #DBEAFE; color: #1E3A8A; border-color: #93C5FD; }
      .status-assigned  { background: #FFEDD5; color: #7C2D12; border-color: #FDBA74; }
      .status-pending, .status-draft, .status-on_hold { background: #F3F4F6; color: #374151; border-color: #D1D5DB; }
      .status-cancelled { background: #FEE2E2; color: #7F1D1D; border-color: #FCA5A5; }

      /* Cover page */
      .print-cover {
        min-height: ${landscape ? "180mm" : "260mm"};
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        text-align: center; padding: 20px;
      }
      .print-cover .band {
        width: 100%; height: 10px; border-radius: 999px;
        background: linear-gradient(90deg, #1E3A8A 0%, #2563EB 50%, #60A5FA 100%);
        margin-bottom: 28px;
      }
      .print-cover .logo { height: 92px; width: auto; margin-bottom: 18px; }
      .print-cover .company { font-size: 20px; font-weight: 700; color: #111827; }
      .print-cover .company-addr { font-size: 12px; color: #4B5563; max-width: 520px; margin: 6px auto 0; }
      .print-cover .doc-title { margin-top: 36px; font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
      .print-cover .doc-sub { margin-top: 6px; font-size: 14px; color: #4B5563; }
      .print-cover .stats {
        margin-top: 36px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px; width: 100%; max-width: 620px;
      }
      .print-cover .stat {
        border: 1.5px solid #D1D5DB; border-radius: 12px; padding: 14px 10px; background: #ffffff;
      }
      .print-cover .stat .n { font-size: 22px; font-weight: 700; color: #111827; }
      .print-cover .stat .l { font-size: 11px; color: #4B5563; text-transform: uppercase; letter-spacing: 0.06em; }
      .print-cover .kv {
        margin-top: 30px; width: 100%; max-width: 520px;
        display: grid; grid-template-columns: max-content 1fr; gap: 6px 18px;
        font-size: 13px; text-align: left;
        border-top: 1px solid #E5E7EB; padding-top: 16px;
      }
      .print-cover .kv .k { color: #6B7280; }
      .print-cover .kv .v { color: #111827; font-weight: 600; }

      /* --- Print --- */
      @media print {
        @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm 12mm 16mm; }
        html, body { background: #ffffff !important; }
        .no-print, [data-sidebar], header[data-app-header], nav[aria-label="Breadcrumb"] { display: none !important; }
        main { padding: 0 !important; background: #ffffff !important; }

        .print-page {
          box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
          margin: 0 !important; padding: 0 !important; max-width: none !important; min-height: 0 !important;
        }
        .print-card { box-shadow: none !important; }
        .print-cover { min-height: ${landscape ? "150mm" : "240mm"}; break-after: page; page-break-after: always; }
        .page-break { break-before: page; page-break-before: always; }
        .avoid-break, .print-card, .task-block, .report-card, .loc-block { break-inside: avoid; page-break-inside: avoid; }
        table { font-size: 13px; }
        th, td { padding: 8px 10px !important; }
        thead { display: table-header-group; }
        tr, img { break-inside: avoid; page-break-inside: avoid; }
      }
    `}</style>
  );
}

export function PrintDocHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="print-doc-header">
      <div className="brand">
        <img src={COMPANY_LOGO_URL} alt="Logo" crossOrigin="anonymous" />
        <div>
          <div className="name">{COMPANY_NAME}</div>
          <div className="addr">{COMPANY_ADDRESS}</div>
        </div>
      </div>
      <div className="meta">
        <div className="t">{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <div>Dicetak: {new Date().toLocaleString("id-ID")}</div>
      </div>
    </div>
  );
}

export function PrintDocFooter({ generatedBy }: { generatedBy?: string }) {
  return (
    <div className="print-doc-footer">
      <div>{COMPANY_NAME}</div>
      <div>Generated by FWMS · {new Date().toLocaleDateString("id-ID")}</div>
      <div>
        {generatedBy ? `Oleh: ${generatedBy}` : ""}
      </div>
    </div>
  );
}

export function PrintCover({
  title,
  subtitle,
  period,
  generatedBy,
  stats,
  kv,
}: {
  title: string;
  subtitle?: string;
  period?: string;
  generatedBy?: string;
  stats?: { label: string; value: ReactNode }[];
  kv?: { key: string; value: ReactNode }[];
}) {
  const now = new Date();
  return (
    <section className="print-cover">
      <div className="band" />
      <img className="logo" src={COMPANY_LOGO_URL} alt="Logo" crossOrigin="anonymous" />
      <div className="company">{COMPANY_NAME}</div>
      <div className="company-addr">{COMPANY_ADDRESS}</div>

      <div className="doc-title">{title}</div>
      {subtitle ? <div className="doc-sub">{subtitle}</div> : null}

      {stats && stats.length > 0 ? (
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="n">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="kv">
        {period ? (
          <>
            <div className="k">Periode Laporan</div>
            <div className="v">{period}</div>
          </>
        ) : null}
        <div className="k">Tanggal Cetak</div>
        <div className="v">{now.toLocaleString("id-ID")}</div>
        {generatedBy ? (
          <>
            <div className="k">Dicetak Oleh</div>
            <div className="v">{generatedBy}</div>
          </>
        ) : null}
        {kv?.map((row) => (
          <div key={row.key} style={{ display: "contents" }}>
            <div className="k">{row.key}</div>
            <div className="v">{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = `status-badge status-${status}`;
  return <span className={cls}>{label ?? status}</span>;
}
