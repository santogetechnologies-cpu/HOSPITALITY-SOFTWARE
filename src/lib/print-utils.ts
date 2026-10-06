/**
 * Universal Print Utility for Hotel DRB PMS
 * Solves SPA / Radix Dialog modal print clipping and blank page issues
 * by printing through a clean isolated iframe with full CSS injection.
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
    // Remove any existing print iframes
    const existingIframe = document.getElementById("drb-print-iframe");
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "drb-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.warn("Could not access iframe document, falling back to window.print()");
      window.print();
      return false;
    }

    // Collect all computed stylesheets or link tags if available
    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse !important;
            }
            th, td {
              border-color: #555555 !important;
            }
            svg {
              display: block;
              max-width: 100%;
            }
            .print\\:hidden, button, .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give browser brief time to parse SVG / styles before triggering print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print invocation error:", err);
        window.print();
      }
    }, 250);

    return true;
  } catch (e) {
    console.error("printHtml error:", e);
    window.print();
    return false;
  }
}
