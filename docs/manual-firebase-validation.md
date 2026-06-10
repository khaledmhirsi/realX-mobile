# Manual Firebase Validation

Firebase emulator tooling is intentionally not installed in this repository. Before deploying
Functions, Firestore rules, indexes, or Storage rules, manually validate the following against
the target Firebase project.

## Redemption

- Rotate vendor PINs using `setVendorRedemptionPin`, then confirm public
  `vendors/{vendorId}` documents do not contain `pin`.
- Confirm clients cannot read `vendorRedemptionSecrets`, `redemption_rate_limits`, or
  `transactions` belonging to another user.
- Redeem an offer and gift card with valid and invalid PINs, insufficient balance, concurrent
  requests, and payloads containing fake `uid`, `type`, `vendorName`, and discount fields.
- Confirm transaction vendor names, offers, and discounts match server-side vendor data.

## Verification And Push

- Submit JPEG and PNG IDs, then reject empty, malformed, oversized, or non-image base64.
- Confirm verification status checks fail without the returned status token or with another
  request's token.
- Review the same request concurrently and confirm only one admin transition succeeds.
- Register the same Expo push token for two users and confirm it is removed from the first user.
- Sign out and confirm the device token document and student token array entry are removed.

## Rules And Deployment

- Confirm anonymous, owner, different-user, and admin behavior for profiles and saved items.
- Confirm direct writes to privileged profile fields, secrets, OTPs, rate limits, verification
  requests, transactions, and push-token documents fail.
- Preview deployment and confirm `firestore.rules`, `firestore.indexes.json`, and `storage.rules`
  are all detected before applying changes.
- Enable TTL policies represented in `firestore.indexes.json` and confirm expired OTP, rate-limit,
  redemption-rate-limit, and verification records are removed.
- Confirm the Android Maps API key is restricted to `com.reelx.app` and the approved signing
  certificate fingerprints in Google Cloud Console.
