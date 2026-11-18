import "dotenv/config";
import { execSync } from "node:child_process";

/** Fresh database for every test run: drop + bootstrap roles + apply migrations. */
export default function setup() {
  execSync("npx tsx scripts/bootstrap-db.ts --drop && npx tsx scripts/migrate.ts", { stdio: "inherit" });
}
