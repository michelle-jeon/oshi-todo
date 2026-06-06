import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneSource = path.join(root, ".next", "standalone");
const standaloneTarget = path.join(root, ".desktop", "standalone");

await access(path.join(standaloneSource, "server.js"));
await rm(path.join(root, ".desktop"), { force: true, recursive: true });
await mkdir(standaloneTarget, { recursive: true });
await cp(standaloneSource, standaloneTarget, { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(standaloneTarget, ".next", "static"), {
  recursive: true
});
await cp(path.join(root, "public"), path.join(standaloneTarget, "public"), {
  recursive: true
});
await rename(
  path.join(standaloneTarget, "node_modules"),
  path.join(standaloneTarget, "server_modules")
);

console.log(`데스크톱 standalone 번들 준비 완료: ${standaloneTarget}`);
