# Domain deploy notes

Production app domain:

```txt
engkidstienganhchobe.tech
www.engkidstienganhchobe.tech
```

This app is a Next.js server app with API routes for admin upload/delete, so it must run on the DigitalOcean droplet or DigitalOcean App Platform. GitHub Pages cannot host the admin upload APIs.

DNS required at the domain provider:

```txt
@      A      <DROPLET_IP>
www    CNAME  engkidstienganhchobe.tech
```

The custom domain needs DNS records pointing to the DigitalOcean server. GitHub Pages cannot run this Next.js server app or its admin upload APIs.

Production env expected on the droplet:

```txt
NEXT_PUBLIC_APP_URL=https://engkidstienganhchobe.tech
ALLOWED_ORIGINS=https://engkidstienganhchobe.tech,https://www.engkidstienganhchobe.tech
```

After code deploy, admin content changes happen at runtime:

- Upload/delete stories: Supabase updates immediately.
- Upload/delete videos: Supabase updates immediately and files are saved/deleted on the droplet SSD.
- Music setting changes: site setting updates immediately.

No redeploy is needed for content changes; redeploy is only needed after code changes.
