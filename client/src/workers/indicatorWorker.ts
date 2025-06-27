// src/workers/indicatorWorker.ts
// Web Worker for heavy technical indicator calculations

importScripts('https://cdn.jsdelivr.net/npm/technicalindicators@3.0.0/dist/browser.js');

self.onmessage = function (e) {
  const { indicator, input } = e.data;
  try {
    // @ts-ignore
    const result = self.TI[indicator](input);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message || 'Calculation error' });
  }
};
