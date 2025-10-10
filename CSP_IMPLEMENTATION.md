# Content Security Policy Implementation

## Summary

Comprehensive security headers have been added to protect against common web vulnerabilities including XSS, clickjacking, MIME-sniffing, and information leakage.

## Implementation Location

`/next.config.js` - Added to the `headers()` function

## Security Headers Added

### 1. Content-Security-Policy (CSP)

Restricts resources that can be loaded and executed on your site.

**Directives:**

- `default-src 'self'` - Only load resources from your own domain by default
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live` - Allow scripts from self and Vercel analytics
  - _Note: 'unsafe-eval' and 'unsafe-inline' needed for Next.js and wallet libraries_
- `style-src 'self' 'unsafe-inline'` - Allow inline styles (required for styled-components/CSS-in-JS)
- `img-src 'self' data: https: blob:` - Allow images from anywhere (for token logos, etc.)
- `font-src 'self' data:` - Allow fonts from self and data URIs
- `connect-src` - Allow connections to:
  - PulseChain RPC: `https://rpc.pulsechain.com`
  - Supabase: `https://*.supabase.co` and `wss://*.supabase.co`
  - WalletConnect: Multiple endpoints for wallet connections
  - Reown (AppKit): `https://*.reown.com` and `wss://*.reown.com`
  - Additional RPC providers: Cloudflare, Ankr
- `frame-src` - Allow iframes from WalletConnect verification services
- `object-src 'none'` - Block plugins like Flash
- `base-uri 'self'` - Restrict base tag to prevent injection
- `form-action 'self'` - Only allow form submissions to same origin
- `frame-ancestors 'none'` - Prevent site from being embedded (clickjacking protection)
- `upgrade-insecure-requests` - Automatically upgrade HTTP to HTTPS

### 2. X-Frame-Options

```
X-Frame-Options: DENY
```

Prevents your site from being embedded in iframes (clickjacking protection).

### 3. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Prevents browsers from MIME-sniffing content-type, reducing XSS risk.

### 4. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Controls how much referrer information is sent with requests:

- Same origin: Full URL
- Cross-origin HTTPS→HTTPS: Only origin
- HTTPS→HTTP: No referrer (prevents leakage)

### 5. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

Enables browser's XSS filter and blocks page if attack detected.
_Note: Legacy header, but provides extra protection for older browsers_

### 6. Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

Blocks access to sensitive browser features:

- Camera
- Microphone
- Geolocation
- FLoC (privacy protection)

## What This Protects Against

### ✅ Cross-Site Scripting (XSS)

- CSP restricts script sources
- X-XSS-Protection adds browser-level protection
- X-Content-Type-Options prevents MIME-sniffing attacks

### ✅ Clickjacking

- X-Frame-Options: DENY
- CSP frame-ancestors: 'none'
- Double protection against iframe embedding

### ✅ Code Injection

- CSP restricts inline scripts (with necessary exceptions)
- base-uri prevents base tag injection
- form-action prevents malicious form submissions

### ✅ Information Leakage

- Referrer-Policy limits referrer information
- Permissions-Policy blocks unnecessary browser features

### ✅ Man-in-the-Middle (MITM)

- upgrade-insecure-requests forces HTTPS
- Strict origin policies

## Wallet Integration Support

The CSP has been carefully configured to support:

- **WalletConnect** - WebSocket and HTTPS endpoints
- **Reown/AppKit** - New WalletConnect stack
- **MetaMask** - Via standard wallet providers
- **All Web3 wallets** - Standard connection methods

## Testing

### Verify Headers Are Applied

```bash
curl -I https://your-domain.com
```

Look for the security headers in the response.

### Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Click on main document request
5. Check Response Headers

### CSP Violations

Check browser console for CSP violation reports if anything breaks.

## Known Tradeoffs

### 'unsafe-inline' and 'unsafe-eval'

These are generally not recommended, but required for:

- Next.js dynamic imports
- Wallet connection libraries (ethers.js, viem, wagmi)
- Styled-components / CSS-in-JS
- WalletConnect modal and UI

**Risk Mitigation:**

- Other CSP directives still provide protection
- XSS protection header adds extra layer
- Input validation prevents injection at source

### Broad img-src Policy

Allows images from any HTTPS source because:

- Token logos come from various sources
- User avatars from external providers
- NFT images, etc.

**Risk Mitigation:**

- Only affects images (low risk)
- No script execution from images
- Supabase storage for trusted images

## Maintenance

### Adding New Services

If you add new third-party services, update CSP `connect-src`:

```javascript
"connect-src 'self' https://rpc.pulsechain.com ... https://new-service.com";
```

### Testing Changes

Always test in development after CSP changes:

1. Check wallet connections work
2. Verify all API calls succeed
3. Ensure images load correctly
4. Test all interactive features

### CSP Reporting (Future Enhancement)

Consider adding CSP reporting:

```javascript
"report-uri https://your-domain.com/csp-report";
```

This will send violation reports so you can monitor and refine the policy.

## Browser Compatibility

All headers are supported by modern browsers:

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

Legacy browsers (IE11) have partial support but won't break.

## Security Score Impact

These headers should significantly improve security scores on:

- [Security Headers](https://securityheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

## Next Steps

Consider:

1. Add CSP reporting endpoint
2. Tighten script-src once dependencies allow
3. Add Subresource Integrity (SRI) for CDN resources
4. Implement nonce-based CSP for inline scripts
5. Add Strict-Transport-Security (HSTS) header

---

**Implementation Date:** October 10, 2025  
**Status:** ✅ Complete  
**Security Issue Addressed:** #11 (LOW Severity) - Missing Content Security Policy
