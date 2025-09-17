Email Provider Setup

The app supports both Resend and Postmark for outbound email. Set the provider via env:

- EMAIL_PROVIDER=postmark | resend

Postmark envs:
- POSTMARK_SERVER_TOKEN=pm_xxx
- POSTMARK_MESSAGE_STREAM=outbound (default)
- EMAIL_FROM=info@anoint.me

Resend envs:
- RESEND_API_KEY=re_xxx
- EMAIL_FROM=info@anoint.me

Inbound (optional):
- Postmark webhook → /api/email/inbound/postmark

