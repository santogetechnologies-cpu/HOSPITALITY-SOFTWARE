/**
 * Universal Print Utility for Hotel DRB PMS
 * Prints HTML content or DOM elements via an offscreen iframe with self-contained CSS.
 */

export function printElementById(elementId: string, title = "HOTEL DRB"): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Print Error: Element with id "${elementId}" not found.`);
    window.print();
    return false;
  }
  return printHtml(element.innerHTML, title);
}

export function printHtml(htmlContent: string, title = "HOTEL DRB"): boolean {
  try {
    // Remove previous iframe if present
    const existingIframe = document.getElementById("drb-print-iframe");
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "drb-print-iframe";
    // Must have concrete dimensions and visibility: visible so Chrome's layout engine paints the contents
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "-9999px";
    iframe.style.width = "900px";
    iframe.style.height = "100vh";
    iframe.style.border = "none";
    iframe.style.zIndex = "-9999";
    iframe.style.opacity = "0.01";
    iframe.style.pointerEvents = "none";
    iframe.style.visibility = "visible";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.warn("Could not access iframe document, fallback to window.print()");
      window.print();
      return false;
    }

    // Collect all stylesheets from main document
    const headStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en" class="light" style="background:#fff !important; color:#000 !important;">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          ${headStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
              width: 100% !important;
              display: block !important;
              visibility: visible !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 24px !important;
              display: block !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid !important;
            }
            th, td {
              color: #000000 !important;
            }
            svg {
              display: block !important;
              max-width: 100% !important;
            }
            /* Universal contrast overrides for print */
            .text-foreground, .text-neutral-900, .text-black {
              color: #000000 !important;
            }
            .text-muted-foreground, .text-neutral-700, .text-neutral-800 {
              color: #333333 !important;
            }
            .border-border, .border-neutral-300, .border-neutral-400 {
              border-color: #666666 !important;
            }
            .bg-card, .bg-background, .bg-white {
              background-color: #ffffff !important;
            }
            .bg-muted, .bg-neutral-50, .bg-neutral-100 {
              background-color: #f3f4f6 !important;
            }
            .text-brass, .text-amber-300, .text-amber-400 {
              color: #78350f !important;
            }
            .text-emerald-300, .text-emerald-400, .text-emerald-600 {
              color: #065f46 !important;
            }
            .print\\:hidden, button, .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="light" style="background:#fff !important; color:#000 !important;">
          <div class="print-wrapper" style="width:100%; display:block; visibility:visible; background:#fff; color:#000;">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print after styles and layout calculation settle
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print invocation error:", err);
        window.print();
      }
    }, 300);

    return true;
  } catch (e) {
    console.error("printHtml error:", e);
    window.print();
    return false;
  }
}
