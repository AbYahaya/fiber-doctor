import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { FiberConfigError } from "../utils/errors.js";

const DEFAULT_CONFIG_FILE = "fiber-doctor.config.json";
const DEFAULT_RPC_URL = "http://127.0.0.1:8227";

const configSchema = z.object({
  rpcUrl: z.string().url().optional(),
});

export type FiberDoctorConfig = z.infer<typeof configSchema>;

export type LoadConfigOptions = {
  rpcUrl?: string;
  configPath?: string;
};

export type ResolvedFiberDoctorConfig = {
  configPath?: string;
  rpcUrl: string;
};

export function loadConfig(
  options: LoadConfigOptions = {},
): ResolvedFiberDoctorConfig {
  const configPath = resolve(options.configPath ?? DEFAULT_CONFIG_FILE);
  const fileConfig = existsSync(configPath) ? readConfigFile(configPath) : {};
  const rpcUrl = options.rpcUrl ?? fileConfig.rpcUrl ?? DEFAULT_RPC_URL;

  return {
    configPath: existsSync(configPath) ? configPath : undefined,
    rpcUrl,
  };
}

function readConfigFile(configPath: string): FiberDoctorConfig {
  let rawText: string;
  try {
    rawText = readFileSync(configPath, "utf8");
  } catch (error) {
    throw new FiberConfigError(
      `Could not read config file at ${configPath}: ${String(error)}`,
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    throw new FiberConfigError(
      `Config file at ${configPath} is not valid JSON: ${String(error)}`,
    );
  }

  const result = configSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new FiberConfigError(
      `Config file at ${configPath} is invalid: ${result.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
    );
  }

  return result.data;
}
