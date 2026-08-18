import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

async function createQaPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user || !data.session) throw error || new Error("Anonymous QA user creation failed.");
  const username = `${prefix}${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  client.realtime.setAuth(data.session.access_token);
  return { client, userId: data.user.id, username };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const author = await createQaPlayer("BA");
const reader = await createQaPlayer("BR");
await writeFile(".bbs-e2e-state.json", JSON.stringify({
  projectRef: actualProjectRef,
  author: { userId: author.userId, username: author.username },
  reader: { userId: reader.userId, username: reader.username },
}, null, 2));

const { data: initialUnread, error: initialUnreadError } = await reader.client.rpc("get_bbs_unread_counts");
if (initialUnreadError || initialUnread?.length !== 0) throw initialUnreadError || new Error("Initial BBS unread state was not empty.");

const suffix = Date.now().toString(36).slice(-6);
const { data: thread, error: threadError } = await author.client.rpc("create_bbs_thread", {
  p_category: "STRATEGY_CHAT",
  p_title: `M6 E2E ${suffix}`,
  p_content: "BBS Realtime and unread verification",
});
if (threadError || !thread?.id) throw threadError || new Error("BBS thread creation failed.");

const { data: fetchedThreads, error: fetchThreadsError } = await reader.client
  .from("bbs_threads").select("id,title,updated_at").eq("id", thread.id);
if (fetchThreadsError || fetchedThreads?.length !== 1) throw fetchThreadsError || new Error("Reader could not fetch the BBS thread.");

const { data: unreadAfterThread, error: unreadAfterThreadError } = await reader.client.rpc("get_bbs_unread_counts");
const threadUnread = unreadAfterThread?.find((row) => row.thread_id === thread.id);
if (unreadAfterThreadError || Number(threadUnread?.unread_count || 0) !== 1) {
  throw unreadAfterThreadError || new Error(`Thread unread mismatch: ${JSON.stringify(unreadAfterThread)}`);
}

const { error: markThreadReadError } = await reader.client.rpc("mark_bbs_thread_read", { p_thread_id: thread.id });
if (markThreadReadError) throw markThreadReadError;

let realtimePayload = null;
let realtimePostStarted = false;
const realtimeResult = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("BBS Realtime reply timed out.")), 30_000);
  const channel = reader.client
    .channel(`m6_bbs_${thread.id}_${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bbs_posts" }, (payload) => {
      if (payload.new?.thread_id === thread.id) {
        realtimePayload = payload.new;
        clearTimeout(timeout);
        resolve(channel);
      }
    })
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || realtimePostStarted) return;
      realtimePostStarted = true;
      const { error } = await author.client.rpc("create_bbs_post", {
        p_thread_id: thread.id,
        p_content: "M6 Realtime reply",
      });
      if (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
});
const realtimeChannel = await realtimeResult;
await Promise.race([reader.client.removeChannel(realtimeChannel), wait(2_000)]);
if (!realtimePayload?.id) throw new Error("BBS Realtime payload was empty.");

const { data: unreadAfterReply, error: unreadAfterReplyError } = await reader.client.rpc("get_bbs_unread_counts");
const replyUnread = unreadAfterReply?.find((row) => row.thread_id === thread.id);
if (unreadAfterReplyError || Number(replyUnread?.unread_count || 0) !== 1) {
  throw unreadAfterReplyError || new Error(`Reply unread mismatch: ${JSON.stringify(unreadAfterReply)}`);
}
const { error: markReplyReadError } = await reader.client.rpc("mark_bbs_thread_read", { p_thread_id: thread.id });
if (markReplyReadError) throw markReplyReadError;

const { data: missedReply, error: missedReplyError } = await author.client.rpc("create_bbs_post", {
  p_thread_id: thread.id,
  p_content: "M6 reconnect catch-up reply",
});
if (missedReplyError || !missedReply?.id) throw missedReplyError || new Error("Disconnected reply creation failed.");
const { data: caughtUpPosts, error: catchUpError } = await reader.client
  .from("bbs_posts").select("id").eq("thread_id", thread.id).order("created_at", { ascending: true });
if (catchUpError || !caughtUpPosts?.some((post) => post.id === missedReply.id)) {
  throw catchUpError || new Error("Reconnect fetch did not recover the missed reply.");
}

const { error: directThreadInsertError } = await reader.client.from("bbs_threads").insert({
  category: "STRATEGY_CHAT", title: "forged", content: "forged", user_id: reader.userId, author_name: "forged",
});
const { error: directPostInsertError } = await reader.client.from("bbs_posts").insert({
  thread_id: thread.id, content: "forged", user_id: reader.userId, author_name: "forged",
});
if (!directThreadInsertError || !directPostInsertError) throw new Error("Direct BBS table mutation unexpectedly succeeded.");

const anonymous = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: anonymousRows, error: anonymousReadError } = await anonymous.from("bbs_threads").select("id").eq("id", thread.id);
if (!anonymousReadError && anonymousRows?.length) throw new Error("Anonymous client unexpectedly read BBS data.");

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  author: { userId: author.userId, username: author.username },
  reader: { userId: reader.userId, username: reader.username },
  threadId: thread.id,
  createAndFetch: true,
  threadUnread: true,
  markRead: true,
  realtimeReply: true,
  replyUnread: true,
  reconnectCatchUp: true,
  directMutationDenied: true,
  anonymousReadDenied: true,
}, null, 2));

process.exit(0);
