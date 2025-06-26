/**
 * This script helps resolve Content Security Policy issues during development
 * by setting appropriate meta tags
 */

// Function to add or update CSP meta tag
function updateCSP() {
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  
  if (existingCSP) {
    existingCSP.remove();
  }
  
  // Only add CSP in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval' 'unsafe-inline' http://localhost:* https://*; object-src 'none'; img-src 'self' data: content: blob: http://localhost:* https://*; media-src 'self' data: content: blob: http://localhost:* https://*; style-src 'self' 'unsafe-inline' https://*; font-src 'self' data: https://*; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:* https://*;";
    document.head.appendChild(meta);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateCSP);
} else {
  updateCSP();
}
