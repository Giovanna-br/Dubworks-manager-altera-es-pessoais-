# google-forms-proxy

Edge Function usada para eliminar CORS entre o DubWorks Manager e o Google Apps Script.

Deploy:

```bash
supabase functions deploy google-forms-proxy
```

Secrets recomendados:

```bash
supabase secrets set DUBWORKS_FORMS_WEBAPP_URL="https://script.google.com/macros/s/SEU_DEPLOYMENT/exec"
supabase secrets set DUBWORKS_FORMS_TOKEN="SEU_TOKEN"
```

A URL/token ficam no backend, nunca no Vite.
