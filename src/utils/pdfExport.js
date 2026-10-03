import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format currency numbers in Indian Rupee format without symbol (for PDF clean alignment)
 */
function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-IN');
}

/**
 * Format currency with Rupee prefix
 */
function formatRupee(num) {
  const n = Number(num) || 0;
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

/**
 * Download ALR Daily Collection Register as a beautifully formatted PDF.
 *
 * @param {Object} options
 * @param {Array} options.rows Filtered borrower rows
 * @param {Object} options.summary Summary statistics (total_clients, total_principal, total_collected, etc.)
 * @param {Object} options.filters Applied filters (status, from_sl_no, to_sl_no, village, etc.)
 * @param {string} options.monthYear Active month-year string (e.g. '2026-10')
 * @param {string} options.companyName Company name
 * @param {boolean} options.showDays Whether to show daily breakdown (1-31)
 * @param {number} options.totalDays Total days in the month (e.g. 30 or 31)
 */
export function downloadRegisterPdf({
  rows = [],
  summary = {},
  filters = {},
  monthYear = '',
  companyName = 'ALR Finance',
  showDays = false,
  totalDays = 31
}) {
  const [year, month] = (monthYear || '').split('-');
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthLabel = mIndex >= 0 && mIndex < 12 ? `${monthNames[mIndex]} ${year}` : monthYear;
  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const exportTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Create landscape PDF for register tables
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Top Decorative Brand Bar
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Line (Emerald / Indigo)
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 11);

  // Subtitle / Register Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`DAILY COLLECTION REGISTER (ALR) • MONTH: ${monthLabel}`, 14, 18);

  // Top Right Info (Export Date & Time)
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Exported: ${exportDate} ${exportTime}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`Total Records: ${rows.length} Borrowers`, pageWidth - 14, 18, { align: 'right' });

  // 2. Filter Scope Badges Ribbon (Below header)
  let ribbonY = 29;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, ribbonY, pageWidth - 28, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600

  // Filter chips text
  const statusText = `Status: ${(filters.status || 'All').toUpperCase()}`;
  const hasRange = Boolean(filters.from_sl_no || filters.to_sl_no);
  const slRangeText = hasRange
    ? `Range/Code: ${filters.from_sl_no || 'Start'} to ${filters.to_sl_no || 'End'}`
    : 'Range: All';
  const areaText = `Area: ${filters.village || 'All Locations'}`;
  const principalText = (filters.minPrincipal > 0 || (filters.maxPrincipal && filters.maxPrincipal < Infinity))
    ? `Principal: Rs. ${filters.minPrincipal || 0} - Rs. ${filters.maxPrincipal || 'Any'}`
    : 'Principal: All';

  const filterSummary = `Applied Filters:   [ ${statusText} ]     [ ${slRangeText} ]     [ ${areaText} ]     [ ${principalText} ]`;
  doc.text(filterSummary, 18, ribbonY + 6);

  // 3. KPI Executive Summary Cards
  const kpiY = 41;
  const cardWidth = (pageWidth - 28 - 20) / 5; // 5 cards
  const cardHeight = 15;

  const kpis = [
    {
      label: 'TOTAL CLIENTS',
      value: `${summary.total_clients || rows.length}`,
      color: [30, 41, 59], // Slate 800
      bg: [241, 245, 249]
    },
    {
      label: 'TOTAL PRINCIPAL',
      value: `Rs. ${formatNumber(summary.total_principal || rows.reduce((s, r) => s + r.principal, 0))}`,
      color: [30, 41, 59],
      bg: [241, 245, 249]
    },
    {
      label: 'TOTAL COLLECTED',
      value: `Rs. ${formatNumber(summary.total_collected || rows.reduce((s, r) => s + r.total_collected, 0))}`,
      color: [22, 101, 52], // Emerald 800
      bg: [220, 252, 231] // Emerald light
    },
    {
      label: 'TOTAL REMAINING',
      value: `Rs. ${formatNumber(summary.total_remaining || rows.reduce((s, r) => s + r.remaining, 0))}`,
      color: [153, 27, 27], // Rose 800
      bg: [254, 226, 226] // Rose light
    },
    {
      label: 'CLEARED / PENDING',
      value: `${summary.cleared_count || rows.filter(r => r.status === 'cleared').length} / ${summary.pending_count || rows.filter(r => r.status !== 'cleared').length}`,
      color: [67, 56, 202], // Indigo 700
      bg: [238, 242, 255]
    }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = 14 + idx * (cardWidth + 5);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 4, kpiY + 4.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, cx + 4, kpiY + 11.5);
  });

  // 4. Data Table Definition
  const tableStartY = kpiY + cardHeight + 5;

  let headCols = [];
  let colStyles = {};
  let bodyRows = [];

  if (!showDays) {
    // Standard Summary Register View (Clean, wide, easily readable)
    headCols = [
      ['Sl', 'Borrower Name', 'Phone', 'Address / Area', 'Principal', 'Collected', 'Remaining', 'Excess', 'Rate %', 'Status']
    ];

    colStyles = {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 46, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [22, 101, 52] },
      6: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'center', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 25 }
    };

    bodyRows = rows.map((r, idx) => {
      const isCleared = r.status === 'cleared' || (r.remaining === 0 && r.principal > 0);
      const statusText = isCleared ? 'CLEARED' : (r.status === 'partial' ? 'PARTIAL' : 'PENDING');
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : (r.sl_no || idx + 1);
      return [
        slDisplay,
        r.name || '-',
        r.phone || '-',
        r.address || '-',
        formatNumber(r.principal),
        formatNumber(r.total_collected),
        formatNumber(r.remaining),
        r.excess > 0 ? formatNumber(r.excess) : '-',
        `${r.collection_rate || 0}%`,
        statusText
      ];
    });

    // Totals Row
    const grandPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    const grandCollected = rows.reduce((s, r) => s + r.total_collected, 0);
    const grandRemaining = rows.reduce((s, r) => s + r.remaining, 0);
    const grandExcess = rows.reduce((s, r) => s + r.excess, 0);
    const overallRate = grandPrincipal > 0 ? Math.round((grandCollected / grandPrincipal) * 100) : 0;

    bodyRows.push([
      '',
      'TOTALS',
      `${rows.length} Borrowers`,
      '',
      formatNumber(grandPrincipal),
      formatNumber(grandCollected),
      formatNumber(grandRemaining),
      formatNumber(grandExcess),
      `${overallRate}%`,
      grandRemaining === 0 ? 'ALL CLEARED' : 'PENDING'
    ]);
  } else {
    // Detailed Days 1 to 31 View (Compressed for landscape print)
    const headerRow = ['Sl', 'Name', 'Prin'];
    for (let d = 1; d <= totalDays; d++) {
      headerRow.push(String(d));
    }
    headerRow.push('Total', 'Rem', 'Status');
    headCols = [headerRow];

    const dayWidth = (pageWidth - 28 - 10 - 32 - 16 - 18 - 18 - 18) / totalDays;
    colStyles = {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 32, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 16 }
    };
    for (let d = 1; d <= totalDays; d++) {
      colStyles[2 + d] = { halign: 'center', cellWidth: dayWidth };
    }
    colStyles[3 + totalDays] = { halign: 'right', cellWidth: 18, fontStyle: 'bold', textColor: [22, 101, 52] };
    colStyles[4 + totalDays] = { halign: 'right', cellWidth: 18, fontStyle: 'bold' };
    colStyles[5 + totalDays] = { halign: 'center', cellWidth: 18 };

    bodyRows = rows.map((r, idx) => {
      const slDisplay = r.client_code ? `${r.sl_no || idx + 1}\n(${r.client_code})` : (r.sl_no || idx + 1);
      const row = [slDisplay, r.name || '-', formatNumber(r.principal)];
      for (let d = 1; d <= totalDays; d++) {
        const val = (r.days && r.days[d]) || 0;
        row.push(val > 0 ? String(val) : '');
      }
      const isCleared = r.status === 'cleared' || (r.remaining === 0 && r.principal > 0);
      row.push(formatNumber(r.total_collected));
      row.push(formatNumber(r.remaining));
      row.push(isCleared ? 'CLEARED' : 'PENDING');
      return row;
    });

    // Totals Row
    const totalsRow = ['', 'TOTALS', formatNumber(rows.reduce((s, r) => s + r.principal, 0))];
    for (let d = 1; d <= totalDays; d++) {
      const sum = rows.reduce((s, r) => s + ((r.days && r.days[d]) || 0), 0);
      totalsRow.push(sum > 0 ? String(sum) : '');
    }
    totalsRow.push(formatNumber(rows.reduce((s, r) => s + r.total_collected, 0)));
    totalsRow.push(formatNumber(rows.reduce((s, r) => s + r.remaining, 0)));
    totalsRow.push(`${rows.length} loans`);
    bodyRows.push(totalsRow);
  }

  // 5. Generate AutoTable with Color Logic
  const totalRowCount = bodyRows.length;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14, bottom: 14 },
    head: headCols,
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [226, 232, 240], // Slate 200 borders
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50 subtle zebra
    },
    columnStyles: colStyles,
    didParseCell: function (data) {
      if (data.section === 'body') {
        const isTotalsRow = data.row.index === totalRowCount - 1;

        if (isTotalsRow) {
          // Distinct Totals Row Styling
          data.cell.styles.fillColor = [226, 232, 240]; // Slate 200
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
          data.cell.styles.lineWidth = 0.4;
          data.cell.styles.lineColor = [100, 116, 139];
          return;
        }

        const remainingColIndex = showDays ? 4 + totalDays : 6;
        const statusColIndex = showDays ? 5 + totalDays : 9;
        const collectedColIndex = showDays ? 3 + totalDays : 5;

        // Color Total Collected column with subtle green
        if (data.column.index === collectedColIndex) {
          data.cell.styles.textColor = [22, 101, 52]; // Dark green
          data.cell.styles.fontStyle = 'bold';
        }

        // Color Remaining column with Green/Red
        if (data.column.index === remainingColIndex) {
          const val = data.cell.raw;
          const numVal = parseFloat(String(val).replace(/,/g, '')) || 0;
          if (numVal > 0) {
            // RED highlight for pending balance
            data.cell.styles.fillColor = [254, 226, 226]; // Soft red
            data.cell.styles.textColor = [153, 27, 27]; // Dark red
            data.cell.styles.fontStyle = 'bold';
          } else {
            // GREEN highlight for zero remaining
            data.cell.styles.fillColor = [220, 252, 231]; // Soft green
            data.cell.styles.textColor = [22, 101, 52]; // Dark green
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Color Status column badge
        if (data.column.index === statusColIndex) {
          const rawStatus = String(data.cell.raw || '').toUpperCase();
          if (rawStatus.includes('CLEAR')) {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else if (rawStatus.includes('PARTIAL')) {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [146, 64, 14];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    didDrawPage: function (data) {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400

      // Left footer: Confidentiality notice
      doc.text('Confidential • Daily Collection Microfinance Ledger • ALR Finance System', 14, pageHeight - 7);

      // Right footer: Page number
      doc.text(pageStr, pageWidth - 14, pageHeight - 7, { align: 'right' });
    }
  });

  // Calculate actual total pages and update
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // Construct descriptive filename
  const hasRangeTag = Boolean(filters.from_sl_no || filters.to_sl_no);
  const slTag = hasRangeTag
    ? `_${String(filters.from_sl_no || 'start').replace(/[^a-zA-Z0-9_-]/g, '')}-${String(filters.to_sl_no || 'end').replace(/[^a-zA-Z0-9_-]/g, '')}`
    : '';
  const statusTag = filters.status && filters.status !== 'all' ? `_${filters.status}` : '';
  const filename = `ALR_Register_${monthYear}${statusTag}${slTag}.pdf`;

  // Trigger browser download
  doc.save(filename);
}

/**
 * Download single member complete multi-month ledger as PDF statement
 */
export function downloadMemberHistoryPdf({
  client = {},
  monthHistory = [],
  closedRecords = [],
  companyName = 'ALR Finance'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Top Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text('BORROWER PAYMENT HISTORY & LEDGER STATEMENT', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Exported: ${exportDate}`, pageWidth - 14, 16, { align: 'right' });

  // Member Information Card
  const infoY = 35;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, infoY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('MEMBER DETAILS', 18, infoY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Name: ${client.name || '-'}`, 18, infoY + 12);
  doc.text(`Serial No: #${client.sl_no || '-'}`, 18, infoY + 18);

  doc.text(`Phone: ${client.phone || '-'}`, pageWidth / 2, infoY + 12);
  doc.text(`Address: ${client.address || '-'}`, pageWidth / 2, infoY + 18);

  // Grand Totals Computation
  const grandPrincipal = monthHistory.reduce((s, m) => s + (m.principal || 0), 0);
  const grandCollected = monthHistory.reduce((s, m) => s + (m.total_collected || 0), 0);
  const grandRemaining = Math.max(0, grandPrincipal - grandCollected);
  const overallRate = grandPrincipal > 0 ? Math.round((grandCollected / grandPrincipal) * 100) : 0;

  // KPI Row
  const kpiY = infoY + 28;
  const kpiWidth = (pageWidth - 28 - 15) / 4;
  const kpis = [
    { label: 'TOTAL PRINCIPAL', val: `Rs. ${formatNumber(grandPrincipal)}`, color: [30, 41, 59], bg: [241, 245, 249] },
    { label: 'TOTAL COLLECTED', val: `Rs. ${formatNumber(grandCollected)}`, color: [22, 101, 52], bg: [220, 252, 231] },
    { label: 'TOTAL REMAINING', val: `Rs. ${formatNumber(grandRemaining)}`, color: [153, 27, 27], bg: [254, 226, 226] },
    { label: 'OVERALL RECOVERY', val: `${overallRate}%`, color: [67, 56, 202], bg: [238, 242, 255] }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = 14 + idx * (kpiWidth + 5);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, kpiY, kpiWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 3, kpiY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, cx + 3, kpiY + 11);
  });

  // Multi-month History Table
  const tableStartY = kpiY + 18;
  const tableHead = [['Month / Cycle', 'Principal', 'Collected', 'Remaining', 'Excess', 'Paid Days', 'Rate', 'Status']];
  const tableBody = monthHistory.map(m => [
    m.cycle_name || m.month_year,
    formatNumber(m.principal),
    formatNumber(m.total_collected),
    formatNumber(m.remaining),
    m.excess > 0 ? formatNumber(m.excess) : '-',
    `${m.paid_days || 0} days`,
    `${m.collection_rate || 0}%`,
    m.remaining === 0 ? 'CLEARED' : 'PENDING'
  ]);

  // Grand Totals Row
  tableBody.push([
    'GRAND TOTAL',
    formatNumber(grandPrincipal),
    formatNumber(grandCollected),
    formatNumber(grandRemaining),
    formatNumber(monthHistory.reduce((s, m) => s + (m.excess || 0), 0)),
    `${monthHistory.reduce((s, m) => s + (m.paid_days || 0), 0)} days`,
    `${overallRate}%`,
    grandRemaining === 0 ? 'ALL CLEARED' : 'PENDING'
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14, bottom: 14 },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'right', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 24, fontStyle: 'bold', textColor: [22, 101, 52] },
      3: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 20 }
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        const isTotals = data.row.index === tableBody.length - 1;
        if (isTotals) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.fontStyle = 'bold';
          return;
        }

        // Remaining column highlight
        if (data.column.index === 3) {
          const val = parseFloat(String(data.cell.raw).replace(/,/g, '')) || 0;
          if (val > 0) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
          } else {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
          }
        }

        // Status badge
        if (data.column.index === 7) {
          if (String(data.cell.raw).includes('CLEARED')) {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
          } else {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
          }
        }
      }
    }
  });

  const safeName = (client.name || 'member').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  doc.save(`Member_Ledger_${safeName}_${client.sl_no || ''}.pdf`);
}
