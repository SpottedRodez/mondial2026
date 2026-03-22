// V4 - NO firebase-admin - pure fetch only
// If you see this comment in logs it means the right file is loaded

export default async function handler(req, res) {
  // Quick sanity check - no imports at all
  const env = {
    hasApiKey: !!process.env.FOOTBALL_API_KEY,
    hasFbUrl:  !!process.env.FIREBASE_DATABASE_URL,
    hasFbSA:   !!process.env.FIREBASE_SERVICE_ACCOUNT,
    hasCron:   !!process.env.CRON_SECRET,
    node:      process.version,
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json({ ok: true, message: "V4 loaded - no firebase-admin", env });
}
