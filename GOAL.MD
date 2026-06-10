 # Expo + Firebase Refactor Plan

  ## Summary

  No files were changed. The audit confirmed:

  - Critical security flaw: redeemGiftCard and redeemOffer allow request data to override the authenticated uid and fixed transaction type.
  - Critical secret exposure risk: vendor redemption PINs are plaintext fields on vendor documents that the mobile app reads completely.
  - High deployment risk: firebase.json references missing firestore.rules and firestore.indexes.json.
  - High maintainability risk: the 1,797-line Functions entrypoint disables TypeScript checking with @ts-nocheck.
  - npm run lint, Expo Doctor, and Functions lint/build pass.
  - npx tsc --noEmit fails at components/home/WaktiSheetContent.tsx:513.
  - There are no automated tests or CI workflows.
  - Functions dependency audit reports 1 critical, 3 high, 14 moderate, and 1 low vulnerabilities.
  - Confirmed dead or stale surfaces include components/Buttons.tsx, components/ImageViewer.tsx, unused fetchVendorSearchPage, missing scripts/reset-project.js, and missing web favicon.

  ## Prioritized Changes

  ### P0: Secure Redemption Transactions

  Risk: Critical

  Affected files: functions/src/index.ts, app/redeem/[id].tsx, components/wallet/GiftCardCheckout.tsx, Firestore rules/index files, external admin PIN-management flow.

  - Replace request spreading with explicit allowlisted inputs. Always derive uid from request.auth.uid and transaction type from the callable.
  - Validate vendor IDs, offer indexes, amounts, gift-card values, creator codes, and transaction-type-specific fields.
  - Store transaction vendor names and offer details from server-read vendor data, never client input.
  - Move PINs out of readable vendor documents into a server-only vendorRedemptionSecrets/{vendorId} collection.
  - Store salted PIN hashes, rotate all existing vendor PINs after migration, and remove plaintext PIN fields.
  - Add redemption rate limits and structured security logging.

  Validation:

  - Emulator tests proving callers cannot override uid, type, vendor metadata, or calculated discounts.
  - Verify vendor reads never expose PINs or hashes.
  - Smoke-test offer, gift-card, online, insufficient-balance, invalid-PIN, and concurrent-redemption flows.

  ### P0: Restore Enforceable Firebase Configuration

  Risk: Critical

  Affected files: firebase.json, new tracked firestore.rules, new tracked firestore.indexes.json, storage.rules.

  - Restore the deployed production Firestore rules and indexes into this repository because firebase.json declares this repository as their owner.
  - Explicitly authorize only required public reads, user-owned profile/saved-item operations, and admin operations.
  - Deny all client access to redemption secrets, OTPs, rate limits, verification internals, transactions, and push-token documents.
  - Add indexes for every compound query used by mobile and Functions.
  - Add emulator-backed rules tests before allowing rule deployment.

  Validation:

  - firebase emulators:exec rules tests for anonymous, authenticated owner, different user, and admin roles.
  - Dry-run or preview deployment confirming every referenced Firebase file exists.
  - Verify direct profile and saved-item writes still work without exposing privileged fields.

  ### P1: Harden Verification, OTP, and Push Workflows

  Risk: High

  Affected files: functions/src/index.ts, utils/verificationPending.ts, utils/pushNotifications.ts, onboarding routes.

  - Require a random verification-status token for unauthenticated status checks instead of exposing status, role, and rejection reason by email alone.
  - Make verification submission and review transitions idempotent and concurrency-safe.
  - Validate uploaded image signatures/content, reject empty or malformed base64, and clean up orphaned Storage files on failure.
  - Paginate pending-verification requests and generate signed URLs with bounded concurrency.
  - Add TTL policies for OTP, rate-limit, and temporary verification records.
  - Remove push tokens from previous users when reassigned and add unregister/sign-out handling.
  - Add IP/device-aware protection where email-only rate limits can be bypassed.

  Validation:

  - Tests for email enumeration, token mismatch, duplicate submissions, concurrent reviews, expired OTPs, and reassigned push tokens.
  - Verify rejected and malformed uploads leave no orphaned files.

  ### P1: Restore Type Safety and Automated Checks

  Risk: High

  Affected files: functions/src/index.ts, components/home/WaktiSheetContent.tsx, context/StudentContext.tsx, utils/firebaseQueries.ts, CI configuration.

  - Fix the StyleSheet.absoluteFillObject typecheck failure.
  - Remove @ts-nocheck from Functions and split the entrypoint into typed modules for redemption, onboarding/auth, verification, notifications, and geospatial jobs.
  - Define shared callable request/response and Firestore document types.
  - Add Functions unit/emulator tests and a CI workflow running mobile lint/typecheck, Expo Doctor, Functions lint/build/tests, rules tests, and dependency audit.

  Validation:

  - npm run lint
  - npx tsc --noEmit
  - npx expo-doctor
  - Functions lint, build, tests, and Firebase emulator tests.

  ### P2: Consolidate Data Access and Control Read Costs

  Risk: Medium

  Affected files: utils/firebaseQueries.ts, utils/queryClient.ts, app/search.tsx, app/category/[id].tsx, app/(tabs)/map.tsx, components/home/TrendingOffers.tsx.

  - Move duplicated search/category pagination into typed shared query helpers.
  - Cache mapped application data rather than native Firestore QuerySnapshot objects.
  - Standardize pagination ordering and cursor contracts.
  - Preserve the existing realtime student and recent-redemption behavior.
  - Instrument map tile reads; the current maximum can issue 28 prefix queries and return up to 2,240 documents for an uncached viewport.
  - Add deterministic map query ordering/pagination so dense tiles do not silently omit arbitrary locations.
  - Bound and monitor legacy map and trending-offer fallbacks.

  Validation:

  - Compare Firestore read counts before and after for home, search, category, wallet/history, and map navigation.
  - Test pagination without duplicates or missing items.
  - Manual map tests across zoom levels, cached/offline state, and dense areas.

  ### P3: Remove Dead Code and Repair Project Hygiene

  Risk: Low

  Affected files: components/Buttons.tsx, components/ImageViewer.tsx, utils/firebaseQueries.ts, package.json, pnpm-lock.yaml, functions/package-lock.json, app.json, project assets/scripts.

  - Remove confirmed unused components and query helpers after reference verification.
  - Remove the unused root firebase-admin dependency and audit other apparently unused packages against Expo config-plugin/runtime requirements.
  - Refresh the Functions lockfile and resolve reachable vulnerabilities without blindly applying audit-suggested major downgrades.
  - Choose pnpm as the root package manager and document that Functions separately use npm.
  - Restore or remove the missing reset-project script and favicon reference.
  - Synchronize package/app versions and review stale native static-linking entries.
  - Confirm the Android Maps API key is restricted by application ID and signing certificates.

  Validation:

  - Clean dependency install followed by all lint/type/build checks.
  - Search for removed symbols and run Android/iOS development builds.
  - Confirm reset command, web export, Firebase config, and notification flows.

  ## Public Interface Changes

  - Redemption callables accept explicit typed payloads and ignore/reject privileged fields such as uid, type, vendor names, and calculated values.
  - New server-only vendorRedemptionSecrets/{vendorId} schema stores PIN hashes.
  - Verification submission returns a status token; unauthenticated status checks require that token.
  - Search/category/map helpers return typed page data instead of Firestore snapshots.

  ## Assumptions

  - Existing realtime profile and recent-redemption behavior must remain.
  - This repository owns the Firebase resources declared by its firebase.json.
  - PIN rotation requires coordination with the external admin/CMS writer.
  - Security work ships before architecture cleanup or dependency pruning.

