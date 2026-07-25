import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

// JsBarcode disegna solo formati lineari/1D (CODE128, EAN, UPC, ITF, CODE39,
// CODABAR, ...) su un elemento <svg>. Il valore 'CODABAR' dell'app è accettato
// da JsBarcode così com'è (case-insensitive), non serve una mappa dedicata.
// QR_CODE non è supportato da JsBarcode: va renderizzato a parte con la
// libreria `qrcode`, vedi renderQrCode() più sotto.
export function renderBarcode(svgElement, value, format = 'CODE128') {
  try {
    JsBarcode(svgElement, value, {
      format,
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 16,
      margin: 10,
      background: '#FFFFFF',
      lineColor: '#000000'
    });
    return true;
  } catch {
    try {
      JsBarcode(svgElement, value, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10,
        background: '#FFFFFF',
        lineColor: '#000000'
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Renderizza un QR code su un elemento <canvas> usando la libreria `qrcode`
// (stessa libreria già usata in ShareModal.jsx per il QR di condivisione).
// Restituisce una Promise<boolean> di esito, coerente con l'uso async di
// QRCode.toCanvas.
export async function renderQrCode(canvasElement, value) {
  try {
    await QRCode.toCanvas(canvasElement, value, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    return true;
  } catch {
    return false;
  }
}
