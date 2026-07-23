import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

const files = ["server/index.js", ...javascriptFiles("public")];

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

console.log(`syntax check passed (${files.length} JavaScript files)`);
