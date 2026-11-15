/** Deletes the local PGlite database; it is recreated and re-seeded on the next request. */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".data", "pglite");
fs.rmSync(dir, { recursive: true, force: true });
console.log("Local database removed. Restart `npm run dev` to recreate and seed it.");
