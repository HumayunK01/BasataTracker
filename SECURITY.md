# Security Practices & Guidelines

## Critical Security Configuration

### Environment Variables
- **NEVER** commit `.env` or `.env.local` files to git
- Use `.env.example` as a template with placeholder values
- Keep `.env.local` for local development only
- For production, configure environment variables in your deployment platform

### Supabase Credentials
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are safe to commit (they're public)
- `SUPABASE_SERVICE_ROLE_KEY` is only accessible in backend functions via `Deno.env.get()` - never expose in frontend
- Use Supabase RLS (Row Level Security) policies to enforce access control at the database level

### Secrets Management
- Service role keys and sensitive credentials are injected at runtime via environment variables in Supabase Edge Functions
- Never hardcode secrets in code or configuration files
- Rotate keys periodically and immediately if compromised

## Security Headers

The following headers are configured in `vite.config.ts`:

**Note:** Development CSP is relaxed to allow tooling (React DevTools, HMR, etc.). Production CSP should be stricter with nonce-based inline scripts.

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Forces HTTPS connections (max-age: 1 year) |
| `Content-Security-Policy` | Restricts script/resource loading to prevent XSS |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options: DENY` | Prevents clickjacking attacks |
| `X-XSS-Protection` | Legacy XSS protection for older browsers |
| `Referrer-Policy` | Controls referrer information |
| `Permissions-Policy` | Disables camera, microphone, geolocation |

## Input Validation & Sanitization

- Use Zod schema validation for all user inputs and API responses
- Validate on both client-side (UX) and server-side (security)
- Never trust client-side validation alone

Example:
```typescript
import { z } from 'zod';

const userInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const data = userInputSchema.parse(userInput);
```

## Authentication & Session Management

- Sessions stored in Supabase Auth with automatic refresh tokens
- Session expiry checked and enforced in `useAuth` hook
- Token expiration verified before API calls
- Automatic signout on token refresh failure
- Use `sessionStorage` for sensitive temporary data, `localStorage` for non-sensitive data

## Data Storage

- **localStorage**: Used for theme preference and counter data (non-sensitive)
- **sessionStorage**: Reserved for sensitive temporary data like access tokens
- Never store passwords or secrets in client-side storage
- Clear storage on logout

## CORS & Cross-Origin Requests

- Supabase Edge Functions use explicit CORS headers
- Authorization required for all sensitive endpoints
- Verify Authorization header before processing requests

## API Security

- All Supabase functions verify user authentication via Authorization header
- Use Supabase RLS to enforce row-level access control
- Rate limiting should be configured at the database or function level

## Content Security Policy (CSP)

**Development Environment:**
- CSP allows `'unsafe-inline'` and `'unsafe-eval'` for tooling (React DevTools, HMR)
- Includes external sources (Google Fonts, Supabase)
- Suitable for local development only

**Production Environment (TODO):**
Create a production build that:
- Removes `'unsafe-inline'` and `'unsafe-eval'`
- Uses nonce-based or hash-based inline scripts
- Pins to specific Supabase domains
- Disables frame-src entirely if not needed
- Enables `upgrade-insecure-requests` for automatic HTTP→HTTPS redirect
- Adds `require-sri-for` for subresource integrity

Example production CSP:
```
script-src 'self' 'nonce-{random}' 'strict-dynamic'
style-src 'self' 'nonce-{random}' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
upgrade-insecure-requests
require-sri-for script style
```

## Recommended Security Practices

1. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```

2. **Add Pre-commit Hooks** to prevent committing secrets:
   ```bash
   npm install husky lint-staged --save-dev
   npx husky install
   ```

3. **Monitor for Exposed Credentials**
   - Use tools like `git-secrets` or `detect-secrets`
   - Scan commit history for sensitive patterns

4. **Logging & Monitoring**
   - Never log sensitive information (passwords, tokens)
   - Log security-relevant events (login, permission changes)
   - Monitor for suspicious patterns

5. **Testing**
   - Test authentication edge cases
   - Verify RLS policies block unauthorized access
   - Test input validation with malicious data

## Incident Response

If credentials are exposed:
1. **Immediately revoke** the compromised credentials in Supabase
2. **Remove from git history** using git filter-branch or BFG Repo-Cleaner
3. **Force push** with caution (after reviewing impacts)
4. **Regenerate** new credentials
5. **Audit** logs for unauthorized access
6. **Update** all systems using the old credentials

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
