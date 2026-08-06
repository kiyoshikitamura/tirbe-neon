const storage = new Map();

globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

localStorage.setItem("tribe_demo_uuid", "mock-recipient");

const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("direct_messages", [
  { id: "incoming", sender_id: "mock-sender", recipient_id: "mock-recipient", message: "hello", is_read: false },
  { id: "outgoing", sender_id: "mock-recipient", recipient_id: "mock-sender", message: "hi", is_read: false },
]);

const read = await executeMockRpc(client, "mark_direct_message_read", { p_message_id: "incoming" });
if (read.error || !client.getStorage("direct_messages").find((message) => message.id === "incoming")?.is_read) {
  throw new Error("Recipient could not mark an incoming direct message as read");
}

const rejected = await executeMockRpc(client, "mark_direct_message_read", { p_message_id: "outgoing" });
if (!rejected.error || client.getStorage("direct_messages").find((message) => message.id === "outgoing")?.is_read) {
  throw new Error("Sender incorrectly marked an outgoing direct message as read");
}

console.log("Mock direct-message read verification passed.");
