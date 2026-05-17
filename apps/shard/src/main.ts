// Shard entrypoint — Runtime Process
// V7 Engine Authority + Runtime Adapter 호스트.
// 구현은 M4 마일스톤에서 채운다.

const shardId = process.env.SHARD_ID ?? "shard-local";

async function main() {
  // TODO(M3): heartbeat publisher start (1s)
  // TODO(M4): V7 engine + runtime adapter boot
  // TODO(M6): snapshot ticker
  console.log(`[shard] booting id=${shardId}`);
}

main().catch((err) => {
  console.error(`[shard:${shardId}] fatal`, err);
  process.exit(1);
});
