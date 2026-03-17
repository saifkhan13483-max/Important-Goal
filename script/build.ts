import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building client...");
  await viteBuild();

  console.log("Building server...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/index.cjs",
    external: ["express"],
    banner: { js: '"use strict";' },
  });

  console.log("Build complete. Static files + server in dist/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
