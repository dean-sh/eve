import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { join } from "node:path";
import { promisify } from "node:util";

import { beforeAll, describe, expect, it } from "vitest";

import { useTemporaryDirectories } from "#internal/testing/use-temporary-app-roots.js";
import { EVE_MESSAGE_STREAM_VERSION, EVE_STREAM_VERSION_HEADER } from "#protocol/message.js";
import { mockSandbox } from "#internal/testing/mocks/mock-sandbox.js";
import type { SandboxSession } from "#shared/sandbox-session.js";
import type { ToolModelOutput } from "#tools/definition.js";

type ChartInput = { title: string; points: { date: string; value: number }[] };
type ChartOutput = { chart: string; title: string; pngBase64: string };

let chartTool: {
  execute(input: ChartInput, ctx: { getSandbox(): Promise<SandboxSession> }): Promise<ChartOutput>;
  toModelOutput(output: ChartOutput): ToolModelOutput;
};

const createScratch = useTemporaryDirectories();
const exec = promisify(execFile);

const input: ChartInput = { title: "Revenue", points: [{ date: "2026-05-01", value: 42 }] };

beforeAll(async () => {
  // Execute the published snippet itself so docs edits cannot bypass this regression.
  const page = await readFile(
    new URL("../../../../docs/tutorial/run-analysis.mdx", import.meta.url),
    "utf8",
  );
  const source = page.split('```ts title="agent/tools/chart_series.ts"\n')[1]?.split("\n```")[0];
  if (source === undefined) throw new Error("Missing chart_series tutorial snippet");
  const module = source
    .replace(
      '"eve/tools"',
      JSON.stringify(new URL("../../dist/src/public/tools/index.js", import.meta.url).href),
    )
    .replace('"zod"', JSON.stringify(import.meta.resolve("zod")));
  chartTool = (
    await import(`data:text/javascript;base64,${Buffer.from(module).toString("base64")}`)
  ).default;
});

describe("tutorial chart tool", () => {
  it("reports Python stderr instead of a successful chart path on command failure", async () => {
    const sandbox = mockSandbox({
      run: () => ({
        exitCode: 1,
        stdout: "",
        stderr: "ModuleNotFoundError: No module named 'matplotlib'",
      }),
    });
    await expect(
      chartTool.execute(input, { getSandbox: async () => sandbox.session }),
    ).rejects.toThrow("ModuleNotFoundError");
  });

  it("rejects a successful command that did not create a chart", async () => {
    const sandbox = mockSandbox();
    await expect(
      chartTool.execute(input, { getSandbox: async () => sandbox.session }),
    ).rejects.toThrow("without a PNG file");
  });

  it("returns file bytes to clients without putting base64 in model context", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
      "base64",
    );
    const sandbox = mockSandbox({
      run: async ({ command }) => {
        const script = command.slice("python3 ".length);
        await sandbox.session.writeBinaryFile({
          path: script.replace(/plot\.py$/, "chart.png"),
          content: png,
        });
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    });
    const ctx = { getSandbox: async () => sandbox.session };
    const [first, second] = await Promise.all([
      chartTool.execute(input, ctx),
      chartTool.execute(input, ctx),
    ]);

    expect(first.chart).not.toBe(second.chart);
    expect(Buffer.from(first.pngBase64, "base64")).toEqual(png);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(chartTool.toModelOutput(first)).toEqual({
      type: "json",
      value: { chart: first.chart, title: input.title, status: "rendered" },
    });
  });

  it("saves streamed chart bytes with the documented client script", async () => {
    const root = await createScratch("eve-tutorial-download-");
    const page = await readFile(
      new URL("../../../../docs/tutorial/run-analysis.mdx", import.meta.url),
      "utf8",
    );
    const source = page.split('```js title="save-chart.mjs"\n')[1]?.split("\n```")[0];
    if (source === undefined) throw new Error("Missing save-chart tutorial snippet");
    const script = source.replace(
      '"eve/client"',
      JSON.stringify(new URL("../../dist/src/client/index.js", import.meta.url).href),
    );
    await writeFile(join(root, "save-chart.mjs"), script);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
      "base64",
    );
    const events = [
      {
        type: "action.result",
        data: {
          result: {
            kind: "tool-result",
            toolName: "chart_series",
            callId: "chart-1",
            output: { pngBase64: png.toString("base64") },
          },
        },
      },
      { type: "session.waiting", data: { wait: "next-user-message" } },
    ];
    const server = createServer((request, response) => {
      request.resume();
      if (request.method === "POST") {
        response.writeHead(202, { "content-type": "application/json" });
        response.end(JSON.stringify({ sessionId: "chart-session" }));
        return;
      }
      response.writeHead(200, { [EVE_STREAM_VERSION_HEADER]: EVE_MESSAGE_STREAM_VERSION });
      response.end(events.map((event) => JSON.stringify(event)).join("\n") + "\n");
    });
    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing server address");
      const result = await exec(
        process.execPath,
        [join(root, "save-chart.mjs"), `http://127.0.0.1:${address.port}`],
        { cwd: root },
      );
      expect(result.stdout).toContain("Saved chart.png");
      expect(await readFile(join(root, "chart.png"))).toEqual(png);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
