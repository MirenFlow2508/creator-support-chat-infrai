import { z } from "zod";
import { InfraiHttp } from "./infrai_http.ts";

export const visitorMessage = z.object({
  visitorId: z.string().min(1),
  message: z.string().min(1),
  assetId: z.string().min(1)
});

type ChatInput = z.infer<typeof visitorMessage>;
type Channel = { name: string };
type Token = { token: string };
type Presence = { users?: Array<{ identity?: string }> };
type Published = { event_id?: string };
type EmailReceipt = { message_id: string };

export async function startCreatorSupport(input: ChatInput, client = new InfraiHttp(process.env.INFRAI_API_KEY ?? "")) {
  const message = visitorMessage.parse(input);
  const channelName = `creator-${message.assetId}`;
  // realtime.channel.create starts the conversation channel.
  const channel = await client.request<Channel>("/v1/realtime/channel/create", "POST", {
    channel: channelName
  });
  const token = await client.request<Token>("/v1/realtime/token/issue", "POST", {
    client_id: message.visitorId, channels: [channel.name], capabilities: ["publish", "presence"], ttl_seconds: 3600
  });
  const published = await client.request<Published>("/v1/realtime/publish", "POST", {
    channel: channel.name, event: "visitor.message", data: JSON.stringify(message), account_id: message.visitorId
  });
  const presence = await client.request<Presence>(`/v1/realtime/presence/get/${encodeURIComponent(channel.name)}`, "GET");
  return { channel: channel.name, token: token.token, eventId: published.event_id, activeVisitors: presence.users?.length ?? 0 };
}

export async function emailTranscript(to: string, transcript: string, client = new InfraiHttp(process.env.INFRAI_API_KEY ?? "")) {
  return client.request<EmailReceipt>("/v1/email/send", "POST", {
    to, subject: "Your creator support transcript", body: transcript
  });
}

if (process.argv[1]?.endsWith("creator_support_chat.ts")) {
  const input = { visitorId: "visitor-demo", message: "Where is my download?", assetId: "preset-pack" };
  startCreatorSupport(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
