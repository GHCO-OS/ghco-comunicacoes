import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv();

export type BridgeConfig = {
  host: string;
  port: number;
  token: string;
  storeDir: string;
};

export function getConfig(): BridgeConfig {
  const token = process.env.GHCO_BRIDGE_TOKEN ?? "";

  if (!token || token === "troque-este-token") {
    console.warn("GHCO_BRIDGE_TOKEN is not set to a production-safe value.");
  }

  return {
    host: process.env.GHCO_BRIDGE_HOST ?? "127.0.0.1",
    port: Number(process.env.GHCO_BRIDGE_PORT ?? "8788"),
    token,
    storeDir: path.resolve(process.env.GHCO_STORE_DIR ?? "./store")
  };
}

