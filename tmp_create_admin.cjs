const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const SU = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SU || !SK) { console.error("MISSING ENV"); process.exit(1); }
const id = crypto.randomBytes(16).toString("hex");
const passwordHash = bcrypt.hashSync("Admin#2026", 12);
(async () => {
  const res = await fetch(SU + "/rest/v1/users", {
    method: "POST",
    headers: {
      apikey: SK, Authorization: "Bearer " + SK,
      "Content-Type": "application/json", Prefer: "resolution=immediate,return=representation",
    },
    body: JSON.stringify({ id, email: "admin@shadowstack.app", password_hash: passwordHash, name: "Admin", role: "admin", email_verified: true, two_factor_enabled: false }),
  });
  console.log("HTTP", res.status);
  console.log((await res.text()).slice(0, 400));
})();
