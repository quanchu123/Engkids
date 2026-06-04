# Domain deploy notes

Production app domain:

```txt
engkidstienganhchobe.me
www.engkidstienganhchobe.me
```

This app is a Next.js server app with API routes for admin upload/delete, so it must run on the DigitalOcean droplet or DigitalOcean App Platform. GitHub Pages cannot host the admin upload APIs.

DNS required at the domain provider:

```txt
@      A      <DROPLET_IP>
www    CNAME  engkidstienganhchobe.me
```

The GitHub Pages repo `quanchu123/quanchu123.github.io` currently contains the `CNAME` file for `engkidstienganhchobe.me`. That only makes `quanchu123.github.io` redirect to the custom domain. The custom domain still needs DNS records pointing to the DigitalOcean server.

Production env expected on the droplet:

```txt
NEXT_PUBLIC_APP_URL=https://engkidstienganhchobe.me
ALLOWED_ORIGINS=https://engkidstienganhchobe.me,https://www.engkidstienganhchobe.me
```

After code deploy, admin content changes happen at runtime:

- Upload/delete stories: Supabase updates immediately.
- Upload/delete videos: Supabase updates immediately and files are saved/deleted on the droplet SSD.
- Music setting changes: site setting updates immediately.

No redeploy is needed for content changes; redeploy is only needed after code changes.
