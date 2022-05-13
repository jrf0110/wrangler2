import { spawn } from "child_process";
import path from "path";
import type { ChildProcess } from "child_process";

const isWindows = process.platform === "win32";
let wranglerProcess: ChildProcess;

export function runPages(args: string[]) {
  beforeEach(async () => {
    wranglerProcess = spawn("npm", [...args], {
      shell: isWindows,
      cwd: path.resolve(__dirname, "../"),
      env: { BROWSER: "none", ...process.env },
    });

    wranglerProcess.stdout?.on("data", (chunk) => {
      console.log(chunk.toString());
    });
    wranglerProcess.stderr?.on("data", (chunk) => {
      console.log(chunk.toString());
    });
  });

  afterEach(async () => {
    await new Promise((resolve, reject) => {
      wranglerProcess.once("exit", (code) => {
        if (!code) {
          resolve(code);
        } else {
          reject(code);
        }
      });
      wranglerProcess.kill();
    });
  });
}
