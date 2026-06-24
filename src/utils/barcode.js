import JsBarcode from 'jsbarcode';

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
