import { TorScopeItem } from '../types/proposal';

/**
 * Renders the weekly-based Gantt Chart (1 Month = 4 Weeks, duration in Days)
 * directly to an off-screen HTML5 Canvas and exports as a high-resolution PNG Base64 Data URL.
 */
export function generateGanttChartImage(
  scopeItems: TorScopeItem[],
  totalMonths: number = 6,
  projectTitle: string = 'แผนการดำเนินงานตลอดโครงการตามขอบเขตงาน (TOR)'
): string {
  if (typeof document === 'undefined') return '';

  const scale = 2; // For crisp export in Word
  const canvas = document.createElement('canvas');
  const width = 1260;
  const rowHeight = 36;
  const headerHeight = 100;
  const footerHeight = 40;
  const height = headerHeight + scopeItems.length * rowHeight + footerHeight;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#0F2744';
  ctx.font = 'bold 15px "TH Sarabun New", "Sarabun", "Arial", sans-serif';
  ctx.fillText(`แผนภูมิแกนต์การปฏิบัติงาน (Gantt Chart): ${projectTitle}`, 20, 28);

  ctx.fillStyle = '#556980';
  ctx.font = '12px "TH Sarabun New", "Sarabun", "Arial", sans-serif';
  ctx.fillText(
    `ระยะเวลาดำเนินงานรวม ${totalMonths} เดือน (${totalMonths * 4} สัปดาห์) | แผนรายสัปดาห์ (1 เดือน = 4 วีค) | บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด`,
    20,
    48
  );

  const labelColWidth = 420;
  const chartWidth = width - labelColWidth - 30;
  const totalWeeks = totalMonths * 4;
  const weekColWidth = chartWidth / totalWeeks;
  const monthColWidth = weekColWidth * 4;
  const tableTop = headerHeight - 30;

  // Header 1: Month row
  ctx.fillStyle = '#0F2744';
  ctx.fillRect(20, tableTop, width - 40, 24);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ขอบเขตงานตาม TOR และผู้รับผิดชอบ', 30, tableTop + 16);

  for (let m = 1; m <= totalMonths; m++) {
    const x = labelColWidth + (m - 1) * monthColWidth;
    ctx.strokeStyle = '#274466';
    ctx.beginPath();
    ctx.moveTo(x, tableTop);
    ctx.lineTo(x, tableTop + 24);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px "TH Sarabun New", "Sarabun", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`เดือนที่ ${m}`, x + monthColWidth / 2, tableTop + 16);
  }

  // Header 2: Week row (W1, W2, W3, W4)
  const weekRowTop = tableTop + 24;
  ctx.fillStyle = '#1E3E62';
  ctx.fillRect(20, weekRowTop, width - 40, 20);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('จำแนกข้อหลักและข้อย่อย (ระดับ 1 - 5)', 30, weekRowTop + 14);

  for (let w = 1; w <= totalWeeks; w++) {
    const x = labelColWidth + (w - 1) * weekColWidth;
    const weekInMonth = ((w - 1) % 4) + 1;

    ctx.strokeStyle = '#3B597B';
    ctx.beginPath();
    ctx.moveTo(x, weekRowTop);
    ctx.lineTo(x, weekRowTop + 20);
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '10px "TH Sarabun New", "Sarabun", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`W${weekInMonth}`, x + weekColWidth / 2, weekRowTop + 14);
  }
  ctx.textAlign = 'left';

  // Table Body Rows
  const bodyTop = weekRowTop + 20;

  scopeItems.forEach((item, index) => {
    const y = bodyTop + index * rowHeight;

    // Row alternating background
    ctx.fillStyle = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(20, y, width - 40, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(20, y + rowHeight);
    ctx.lineTo(width - 20, y + rowHeight);
    ctx.stroke();

    // Vertical grid lines for weeks
    for (let w = 1; w <= totalWeeks; w++) {
      const x = labelColWidth + (w - 1) * weekColWidth;
      const isMonthBorder = (w - 1) % 4 === 0;
      ctx.strokeStyle = isMonthBorder ? '#CBD5E1' : '#F1F5F9';
      ctx.lineWidth = isMonthBorder ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
    }

    // Label with indentation based on Level (1-5)
    const indent = (item.level - 1) * 14;
    const isLevel1 = item.level === 1;

    ctx.fillStyle = isLevel1 ? '#0F2744' : '#1E293B';
    ctx.font = isLevel1 ? 'bold 11px "TH Sarabun New", "Sarabun", sans-serif' : '11px "TH Sarabun New", "Sarabun", sans-serif';

    let displayTitle = `${item.clauseNumber} ${item.title}`;
    if (displayTitle.length > 50 - item.level * 3) {
      displayTitle = displayTitle.substring(0, 48 - item.level * 3) + '...';
    }
    ctx.fillText(displayTitle, 28 + indent, y + 15);

    // Days & Responsible note
    ctx.fillStyle = '#64748B';
    ctx.font = '9px "TH Sarabun New", "Sarabun", sans-serif';
    ctx.fillText(`${item.durationDays} วัน | เริ่ม ด.${item.startMonth} W${item.startWeek} | ${item.responsibleRole || '-'}`, 28 + indent, y + 28);

    // Bar calculation (weeks)
    const startWeekAbsolute = (item.startMonth - 1) * 4 + (item.startWeek - 1);
    const durationWeeks = Math.max(0.5, item.durationWeeks || Math.max(1, Math.round(item.durationDays / 7)));

    const startX = labelColWidth + Math.max(0, Math.min(totalWeeks - 0.2, startWeekAbsolute)) * weekColWidth;
    const barW = Math.max(12, Math.min(chartWidth - (startX - labelColWidth), durationWeeks * weekColWidth));
    const barY = y + 7;
    const barH = 20;

    // Color based on level
    const levelColors = [
      { fill: '#0F2744', border: '#0A1B30' }, // Level 1 Main
      { fill: '#1E40AF', border: '#1E3A8A' }, // Level 2
      { fill: '#0D9488', border: '#0F766E' }, // Level 3
      { fill: '#7C3AED', border: '#6D28D9' }, // Level 4
      { fill: '#D97706', border: '#B45309' }, // Level 5
    ];
    const color = levelColors[(item.level - 1) % levelColors.length];

    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 1;

    // Rounded rectangle bar
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(startX + r, barY);
    ctx.lineTo(startX + barW - r, barY);
    ctx.quadraticCurveTo(startX + barW, barY, startX + barW, barY + r);
    ctx.lineTo(startX + barW, barY + barH - r);
    ctx.quadraticCurveTo(startX + barW, barY + barH, startX + barW - r, barY + barH);
    ctx.lineTo(startX + r, barY + barH);
    ctx.quadraticCurveTo(startX, barY + barH, startX, barY + barH - r);
    ctx.lineTo(startX, barY + r);
    ctx.quadraticCurveTo(startX, barY, startX + r, barY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bar text
    if (barW > 28) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px "TH Sarabun New", "Sarabun", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.durationDays} วัน`, startX + barW / 2, barY + 13);
      ctx.textAlign = 'left';
    }
  });

  // Table Outer Border
  ctx.strokeStyle = '#0F2744';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, tableTop, width - 40, 44 + scopeItems.length * rowHeight);

  // Footer Legend
  const legendY = tableTop + 44 + scopeItems.length * rowHeight + 20;
  ctx.fillStyle = '#64748B';
  ctx.font = '10px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.fillText(
    '* กำหนดการทำงานอิงตามระบบรายสัปดาห์ (1 เดือน = 4 สัปดาห์) คำนวณตามจำนวนวันทำงานจริงและแผนขอบเขตงานของหน่วยงานรัฐ',
    20,
    legendY
  );

  return canvas.toDataURL('image/png');
}

/**
 * Creates default conceptual framework diagram
 */
export function generateDefaultConceptualDiagram(): string {
  if (typeof document === 'undefined') return '';

  const scale = 2;
  const canvas = document.createElement('canvas');
  const width = 1000;
  const height = 480;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Title
  ctx.fillStyle = '#0F2744';
  ctx.font = 'bold 18px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('กรอบแนวคิดสถาปัตยกรรมระบบบริการประชาชนดิจิทัล (Enterprise Conceptual Architecture)', width / 2, 45);
  ctx.font = '13px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด | Prime Digital Consultant Co., Ltd.', width / 2, 68);

  const layers = [
    {
      title: 'ชั้นที่ 1: ส่วนการให้บริการและช่องทางการเข้าถึง (User Channels & Front-End)',
      color: '#EFF6FF',
      borderColor: '#3B82F6',
      items: ['Citizen Web Portal (Responsive)', 'Mobile Web / Progressive Web App (PWA)', 'Line Official Account / SMS Gateway', 'ระบบยืนยันตัวตนดิจิทัล (D.DOPA / NDID)'],
      y: 95,
      h: 70
    },
    {
      title: 'ชั้นที่ 2: ส่วนความมั่นคงปลอดภัยและการเชื่อมต่อ (API Gateway & Security Layer)',
      color: '#FEF3C7',
      borderColor: '#F59E0B',
      items: ['Kong API Gateway & Rate Limiting', 'OAuth 2.0 / OpenID Connect & RBAC', 'Web Application Firewall (WAF)', 'SSL/TLS 1.3 Encryption & PDPA Compliance'],
      y: 180,
      h: 70
    },
    {
      title: 'ชั้นที่ 3: ส่วนบริการทางธุรกิจและประมวลผล (Microservices Business Logic)',
      color: '#ECFDF5',
      borderColor: '#10B981',
      items: ['e-Service Request & Tracking Engine', 'Workflow & Approval Management', 'Document & Notification Service', 'Audit Trail & Transaction Logger'],
      y: 265,
      h: 70
    },
    {
      title: 'ชั้นที่ 4: ส่วนการจัดเก็บและบูรณาการข้อมูล (Data Lakehouse & Cloud Infrastructure)',
      color: '#F3E8FF',
      borderColor: '#8B5CF6',
      items: ['Enterprise Relational DB (PostgreSQL)', 'Data Lakehouse & Analytics Pipeline', 'Kubernetes Cluster (Container Orchestration)', 'Automated Backup & Disaster Recovery (DR)'],
      y: 350,
      h: 70
    }
  ];

  layers.forEach((layer) => {
    ctx.fillStyle = layer.color;
    ctx.fillRect(40, layer.y, width - 80, layer.h);

    ctx.strokeStyle = layer.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, layer.y, width - 80, layer.h);

    ctx.fillStyle = layer.borderColor;
    ctx.font = 'bold 12px "TH Sarabun New", "Sarabun", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(layer.title, 55, layer.y + 20);

    const itemWidth = (width - 120) / layer.items.length;
    layer.items.forEach((item, idx) => {
      const itemX = 55 + idx * itemWidth;
      const itemY = layer.y + 30;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(itemX, itemY, itemWidth - 12, 28);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, itemY, itemWidth - 12, 28);

      ctx.fillStyle = '#1E293B';
      ctx.font = '11px "TH Sarabun New", "Sarabun", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item, itemX + (itemWidth - 12) / 2, itemY + 18);
    });
  });

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "TH Sarabun New", "Sarabun", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ออกแบบตามมาตรฐานสากล Open Group TOGAF & Digital Government Framework เพื่อความมั่นคงปลอดภัยและประสิทธิภาพสูงสุด', width / 2, 450);

  return canvas.toDataURL('image/png');
}
