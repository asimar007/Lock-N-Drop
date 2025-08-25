#!/usr/bin/env node

/**
 * Simple verification script to check that IP tracking and cleanup features
 * have been successfully removed from the codebase
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

console.log("🔍 Verifying IP tracking and cleanup removal...\n");

const checks = [
  {
    name: "FileTransferService - IP tracking method removed",
    file: "src/services/FileTransferService.ts",
    shouldNotContain: ["trackUserIP", "track_user_ip"],
    result: false,
  },
  {
    name: "Cleanup scheduler edge function removed",
    file: "supabase/functions/cleanup-scheduler/index.ts",
    shouldNotExist: true,
    result: false,
  },
  {
    name: "Migration file created",
    file: "supabase/migrations/20250825000001_remove_ip_tracking_cleanup.sql",
    shouldExist: true,
    result: false,
  },
  {
    name: "README updated (no IP tracking references)",
    file: "README.md",
    shouldNotContain: ["IP tracking", "IP monitoring"],
    result: false,
  },
];

// Run checks
checks.forEach((check) => {
  try {
    if (check.shouldNotExist) {
      check.result = !existsSync(check.file);
    } else if (check.shouldExist) {
      check.result = existsSync(check.file);
    } else if (check.shouldNotContain) {
      const content = readFileSync(check.file, "utf8");
      check.result = !check.shouldNotContain.some((term) =>
        content.toLowerCase().includes(term.toLowerCase())
      );
    }
  } catch (error) {
    check.result = false;
    check.error = error.message;
  }
});

// Report results
console.log("📊 VERIFICATION RESULTS:\n");
checks.forEach((check) => {
  const status = check.result ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} ${check.name}`);
  if (check.error) {
    console.log(`   Error: ${check.error}`);
  }
});

const allPassed = checks.every((check) => check.result);
console.log(
  `\n${allPassed ? "🎉" : "⚠️"} Overall: ${
    allPassed ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"
  }`
);

if (allPassed) {
  console.log("\n✅ Code changes completed successfully!");
  console.log("⏳ Next step: Apply database migration manually");
  console.log("📖 See: COMPLETE_MIGRATION_GUIDE.md");
} else {
  console.log("\n❌ Some verification checks failed");
  console.log("🔧 Review the failed checks above");
}
