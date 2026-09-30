# google-drive-create-structure

Proxy do DubWorks Manager para Drive/Sheets via Google Apps Script.

Usa os mesmos secrets de `google-forms-proxy`:

```bash
npx supabase secrets set DUBWORKS_FORMS_WEBAPP_URL="https://script.google.com/macros/s/SEU_DEPLOYMENT/exec"
npx supabase secrets set DUBWORKS_FORMS_TOKEN="SEU_TOKEN"
```

Deploy:

```bash
npx supabase functions deploy google-drive-create-structure
```
