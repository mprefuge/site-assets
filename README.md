# Site Assets

This repository contains static assets and JavaScript components for the site, including the attendance tracker and donation popup form.

## Environment Variables

The following environment variables can be configured via GitHub Actions secrets or variables:

### Attendance Tracker

| Variable | Description | Required |
|----------|-------------|----------|
| `ENDPOINT` | The API endpoint URL for attendance tracker operations | Yes |
| `STYLEENDPOINT` | Base URL for stylesheet resources (e.g., `https://example.com/styles/`) | No |

### Donation Form

| Variable | Description | Required |
|----------|-------------|----------|
| `DONATION_API_ENDPOINT` | The API endpoint for donation processing | Yes |
| `STRIPE_PUBLIC_KEY_LIVE` | Stripe live public key | Yes |
| `STRIPE_PUBLIC_KEY_TEST` | Stripe test public key | No |
| `BRAND_PRIMARY` | Primary brand color (hex) | No |
| `BRAND_SECONDARY` | Secondary brand color (hex) | No |
| `BRAND_TERTIARY` | Tertiary brand color (hex) | No |

## GitHub Actions Configuration

### Setting Environment Variables

1. Go to your repository's **Settings** > **Secrets and variables** > **Actions**
2. For sensitive values (API endpoints, keys), use **Secrets**
3. For non-sensitive configuration values, use **Variables**

Example workflow configuration:

```yaml
env:
  STYLEENDPOINT: ${{ vars.STYLEENDPOINT }}
  ENDPOINT: ${{ vars.ENDPOINT }}
```

### Build Process

The GitHub Actions workflows inject environment variables at build time:

1. **Attendance Tracker** (`deploy-attendance-tracker.yml`):
   - Injects `ENDPOINT` and `STYLEENDPOINT` into `config.js`
   - Updates stylesheet paths in HTML if `STYLEENDPOINT` is set

2. **Donation Form** (`scripts/popup/.github/workflows/deploy.yml`):
   - Injects all donation-related configuration into `config.js`

## Local Development

For local development, you can create a `config.js` with hardcoded values or set up environment variables in your development environment:

```javascript
// Example local config for attendance tracker
if (typeof window !== 'undefined') {
  window.ATTENDANCE_CONFIG = {
    ENDPOINT: 'http://localhost:3000/api',
    STYLEENDPOINT: '/styles/'
  };
}
```

## Directory Structure

```
site-assets/
├── attendancetracker/
│   ├── attendancetracker.html  # Main attendance tracker page
│   ├── attendancetracker.js    # Attendance tracker JavaScript
│   └── config.js               # Configuration file for environment variables
├── scripts/
│   ├── lookup.js               # Shared lookup data
│   └── popup/
│       ├── config.js           # Donation form configuration
│       └── form.js             # Donation form JavaScript
└── styles/
    ├── attendancetracker.css   # Attendance tracker styles
    └── form-styles.css         # Form styles
```
