Bun.serve({
  port: 3789,
  fetch() {
    return new Response("GH-3 acceptance ready\n");
  },
});
