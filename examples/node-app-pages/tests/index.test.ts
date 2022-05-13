import { fetch } from "undici";
import { runPages } from "./runPages";
import type { Response } from "undici";

const waitUntilReady = async (url: string): Promise<Response> => {
  let response: Response | undefined = undefined;

  while (response === undefined) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));

    try {
      response = await fetch(url);
    } catch {}
  }

  return response as Response;
};

describe("Pages Dev", () => {
  runPages(["run", "dev"]);
  it("should work with `--node-compat` when running code requiring polyfills", async () => {
    const response = await waitUntilReady("http://localhost:1234/stripe");

    await expect(response.text()).resolves.toMatchInlineSnapshot(
      `"path/to/some-file"`
    );
  });
});
