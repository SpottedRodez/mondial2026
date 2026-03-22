// V4 - NO firebase-admin - pure fetch only
export default async function handler(req, res) {
  const env = {
    hasApiKey: !!process.env.FOOTBALL_API_KEY,
    hasFbUrl:  !!process.env.FIREBASE_DATABASE_URL,
    hasFbSA:   !!process.env.FIREBASE_SERVICE_ACCOUNT,
    hasCron:   !!process.env.CRON_SECRET,
    node:      process.version,
  };
  return res.status(200).json({ ok: true, message: "V4 - no firebase-admin", env });
}
