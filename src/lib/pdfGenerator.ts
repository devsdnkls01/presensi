import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function downloadA4SheetAsPdf(containerId: string, filename: string = 'Lembar_Cetak_A4_SmartSiswa.pdf') {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Element #${containerId} tidak ditemukan.`);
  }

  // Find all individual A4 pages inside the container
  const pageElements = container.querySelectorAll<HTMLElement>('.a4-sheet-page');
  const pagesToRender = pageElements.length > 0 ? Array.from(pageElements) : [container];

  // A4 Landscape dimensions: 297mm x 210mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pagesToRender.length; i++) {
    const pageEl = pagesToRender[i];
    if (i > 0) {
      pdf.addPage('a4', 'landscape');
    }

    // High resolution canvas (scale 3 for crisp ~300 DPI vector-sharp text & QR)
    const canvas = await html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // EXACT 1:1 A4 Landscape physical placement (297mm width, 210mm height)
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  }

  pdf.save(filename);
}

export async function downloadCardAsPdf(elementId: string, filename: string = 'Kartu_Siswa_SmartSiswa.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} tidak ditemukan.`);
  }

  const origShadow = element.style.boxShadow;
  element.style.boxShadow = 'none';

  try {
    const canvas = await html2canvas(element, {
      scale: 3.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Standard ID Card: 53.98mm x 85.60mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [53.98, 85.60],
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 53.98, 85.60, undefined, 'FAST');
    pdf.save(filename);
  } finally {
    element.style.boxShadow = origShadow;
  }
}

export async function downloadCardPairAsPdf(
  frontElementId: string,
  backElementId: string,
  filename: string = 'Kartu_Siswa_SmartSiswa.pdf'
) {
  const frontEl = document.getElementById(frontElementId);
  const backEl = document.getElementById(backElementId);

  if (!frontEl) {
    throw new Error('Elemen kartu depan tidak ditemukan.');
  }

  const origFrontShadow = frontEl.style.boxShadow;
  frontEl.style.boxShadow = 'none';

  let origBackShadow = '';
  if (backEl) {
    origBackShadow = backEl.style.boxShadow;
    backEl.style.boxShadow = 'none';
  }

  try {
    // ID-1 Portrait: 53.98mm x 85.60mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [53.98, 85.60],
      compress: true,
    });

    const frontCanvas = await html2canvas(frontEl, {
      scale: 3.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const frontImg = frontCanvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(frontImg, 'JPEG', 0, 0, 53.98, 85.60, undefined, 'FAST');

    if (backEl) {
      pdf.addPage([53.98, 85.60], 'portrait');
      const backCanvas = await html2canvas(backEl, {
        scale: 3.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const backImg = backCanvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(backImg, 'JPEG', 0, 0, 53.98, 85.60, undefined, 'FAST');
    }

    pdf.save(filename);
  } finally {
    frontEl.style.boxShadow = origFrontShadow;
    if (backEl) backEl.style.boxShadow = origBackShadow;
  }
}

