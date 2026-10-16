// @ts-nocheck — 受け入れ用の一時サーバー。spec 削除時に消える
Bun.serve({
  port: 3789,
  fetch() {
    return new Response("GH-3 acceptance ready\n");
  },
});
