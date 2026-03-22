export default async function handler(req, res) {
  return res.status(200).json({ ok: true, message: "V4 ok - no firebase-admin" });
}
```

**2.** Mets à jour `vercel.json` avec le fichier `vercel_v2.json`

**3.** Supprime l'ancien `api/update-scores.js` 🗑️

Teste ensuite :
```
https://mondial2026.vercel.app/api/update-scores-v2
