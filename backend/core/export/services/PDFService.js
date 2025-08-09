// backend/core/export/services/PDFService.js
const puppeteer = require('puppeteer');

async function htmlToPdfBuffer(html, {
  format = 'A4',
  printBackground = true,
  landscape = false,
  margin = { top: '12mm', bottom: '18mm', left: '12mm', right: '12mm' },
} = {}) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format, printBackground, landscape, margin });
    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { htmlToPdfBuffer };