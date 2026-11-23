/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safe, Idempotent Legacy JSON -> Named Firestore Migration Utility (Priority 4)
 *
 * Migrates records from:
 *   - .everykr-user-management.json
 *   - .everykr-automated-emails.json
 *   - .everykr-newsletter-store.json
 * into additive collections on EVERYKR's named Firestore database:
 *   `ai-studio-everykreverythin-cda39542-8880-4342-b928-74dd6bd4564f`
 *
 * Safety Guarantees:
 *   - Defaults to DRY-RUN mode unless `--apply` is explicitly passed.
 *   - Uses deterministic document IDs and existence checks to prevent duplicates.
 *   - NEVER deletes, truncates, or mutates any legacy JSON files on disk.
 *
 * Usage:
 *   npx tsx scripts/migrateLegacyJsonToFirestore.ts          # Dry-run inspection
 *   npx tsx scripts/migrateLegacyJsonToFirestore.ts --apply  # Apply additive migration
 */

import { migrateLegacyJsonStoresToFirestore } from '../src/server/firestorePersistenceBridge.ts';

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;

  console.log(`\n=== EVERYKR Legacy JSON -> Named Firestore Migration (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);
  const report = await migrateLegacyJsonStoresToFirestore({ dryRun });

  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        dryRun: report.dryRun,
        databaseId: report.databaseId,
        legacyFilesPreservedIntact: report.legacyFilesPreservedIntact,
        totalMigrated: report.totalMigrated,
        totalSkippedDuplicates: report.totalSkippedDuplicates,
        totalErrors: report.totalErrors,
        userManagement: report.userManagement,
        automatedEmails: report.automatedEmails,
        newsletter: report.newsletter,
      },
      null,
      2
    )
  );

  if (!report.ok) {
    process.exit(1);
  }
}

void main();
