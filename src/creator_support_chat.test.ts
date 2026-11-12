import test from "node:test";
import assert from "node:assert/strict";
import { startCreatorSupport, visitorMessage } from "./creator_support_chat.ts";
import { InfraiHttp } from "./infrai_http.ts";

test("a support message must identify the asset it concerns", () => {
  const parsed = visitorMessage.safeParse({ visitorId: "v-1", message: "Need the files", assetId: "font-bundle" });
  assert.equal(parsed.success, true);
  assert.equal(visitorMessage.safeParse({ visitorId: "v-1", message: "Need the files" }).success, false);
});

test("the returned channel name scopes the token, publish, and presence requests", async () => {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  class ChatClient extends InfraiHttp {
    override async request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<T> {
      calls.push({ path, method, body });
      const responses = [{ name: "returned-room" }, { token: "test-token" }, { event_id: "event-1" }, { users: [] }];
      return responses[calls.length - 1] as T;
    }
  }
  const input = { visitorId: "v-1", message: "Need the files", assetId: "font-bundle" };
  const result = await startCreatorSupport(input, new ChatClient("test-key"));
  assert.deepEqual(calls, [
    { path: "/v1/realtime/channel/create", method: "POST", body: { channel: "creator-font-bundle" } },
    { path: "/v1/realtime/token/issue", method: "POST", body: {
      client_id: "v-1", channels: ["returned-room"], capabilities: ["publish", "presence"], ttl_seconds: 3600
    } },
    { path: "/v1/realtime/publish", method: "POST", body: {
      channel: "returned-room", event: "visitor.message", data: JSON.stringify(input), account_id: "v-1"
    } },
    { path: "/v1/realtime/presence/get/returned-room", method: "GET", body: undefined }
  ]);
  assert.equal(result.channel, "returned-room");
});
