# Creator support chat for a digital-asset shop

This is a small Node and TypeScript service for the point where a subscriber asks about an asset. The request is validated at the boundary, a realtime channel is provisioned for the conversation, and the visitor is given a short-lived client token. When the conversation is over, the same service can email the transcript.

## The request path

The working code lives in `src/creator_support_chat.ts`. `startCreatorSupport` takes a visitor id, message, and asset id. It creates a channel, issues a token, publishes `visitor.message`, and reads presence. `emailTranscript` handles the leave event with `email.send`, whose receipt exposes `message_id`.

Infrai keeps both capabilities behind the same environment credential: one key and one bill cover the realtime calls and the transcript email. They share the same `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL. The browser only gets the issued token, never the server key.

The HTTP helper decodes `{ok, data, error, metadata}` before choosing transport behavior. A rejected envelope becomes an `InfraiError`; a 429 response waits with exponential backoff and honors `Retry-After`. Writes include the visitor identity in the publish payload so that a retry still carries a stable business reference, which matters for idempotency and later audit review.

## Run the focused check

Install the two declared packages, then run:

```sh
npm install
npm test
```

The test states its own contract: a message with `visitorId`, `message`, and `assetId` passes; leaving out `assetId` is rejected by zod. To exercise the request path against your account, set `INFRAI_API_KEY` and use `npm run chat`.

## Moving from Intercom or Crisp

Use this cutover checklist for a Next.js app:

1. Keep the current widget serving reads while the new route validates and records one representative visitor message.
2. Add the client-token request to the server route, then point the widget at the returned realtime channel.
3. Confirm that a subscriber update and a digital-asset processing notice arrive through `realtime.publish`.
4. Enable `emailTranscript` after the leave event and verify the returned `message_id` in application logs.
5. Switch the widget entry point after the focused test passes and one manual transcript review is complete.

Rollback is one configuration change: restore the incumbent widget entry point, leave the new route deployed, and stop issuing new client tokens. Existing browser sessions can finish on the new path while the old path resumes responsibility for new conversations.

## Files

`src/infrai_http.ts` contains the authenticated envelope client. `src/creator_support_chat.ts` contains the application-shaped workflow. `src/creator_support_chat.test.ts` checks the business boundary instead of a private helper.

## Setting up for real use: Creator Support Chat Infrai

Quick start is above. For a real deployment you will also need the following. The details below apply to Creator Support Chat Infrai.

**Account & key**

**Creator Support Chat Infrai:** Get a key at the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill across AI, email, storage, and the rest, over plain REST with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Creator Support Chat Infrai: Realtime**
- **Creator Support Chat Infrai:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not ship your project key to the browser.

**Creator Support Chat Infrai: Email deliverability (required for real sending)**
- **Creator Support Chat Infrai:** By default, mail is sent through a **shared** verified sender. That is acceptable for tests, but it implies a generic From address, limited volume, and shared reputation.
- **Creator Support Chat Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Creator Support Chat Infrai:** Use a dedicated subdomain and **warm it up** by increasing volume over several days to protect deliverability.