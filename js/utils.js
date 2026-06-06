// Pure formatting, escaping, and rewards-math helpers shared across the app.
//
// Loaded as an ES module (see index.html) and imported by feature modules.
// Kept dependency-free (no references to app state or `elements`) so
// they can be evaluated and unit-tested in isolation (see tests/utils.test.js).

// Rewards configuration: for every ₹100 spent, 4 whole points are earned;
// while redeeming, 4 points = ₹1 (whole rupees only).
const POINT_EARN_RATE = 100; // Rupees per earn block
const POINTS_PER_EARN_BLOCK = 4; // Points earned per ₹100
const POINTS_PER_REDEEM_RUPEE = 4; // 4 points = ₹1

export const formatINR = (value) => `₹${Number(value || 0).toFixed(2)}`;

export const formatCost = (value) => {
  const numValue = Number(value || 0);
  return numValue > 0 ? formatINR(numValue) : "-";
};

export const escapeHtml = (text) => {
  if (!text && text !== 0) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};

export const normalizeCategory = (category) =>
  String(category || "")
    .trim()
    .toLowerCase();

export function calculateEarnedPoints(amount) {
  if (!amount || amount <= 0) return 0;
  const blocks = Math.floor(amount / POINT_EARN_RATE);
  return blocks * POINTS_PER_EARN_BLOCK;
}

export function calculateRedeemFromPoints(points, maxRupees) {
  const safePoints = Math.max(0, Math.floor(points || 0));
  const maxFromPoints = Math.floor(safePoints / POINTS_PER_REDEEM_RUPEE); // max rupees possible
  const safeMaxRupees = Math.floor(Math.max(0, maxRupees || 0));
  const rupeesToApply = Math.min(maxFromPoints, safeMaxRupees);
  const pointsToRedeem = rupeesToApply * POINTS_PER_REDEEM_RUPEE;
  return { pointsToRedeem, rupeesToApply };
}

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const slugifyFormName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
