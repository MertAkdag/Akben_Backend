/**
 * Push diagnostic — aktif cihaz token'larını Expo'ya direkt gönderir, HAM yanıtı basar.
 * Amaç: sentCount:0/failedCount:N'in gerçek sebebini görmek (ticket error details).
 * Çalıştır:  node -r ts-node/register/transpile-only scripts/notif-diag.ts
 */
import "dotenv/config";
import { prisma } from "../src/config/prisma";

const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";

async function main() {
  const devices = await prisma.device.findMany({
    where: { disabledAt: null },
    select: { expoPushToken: true, platform: true, userId: true, deviceName: true },
  });
  console.log(`aktif cihaz: ${devices.length}`);
  for (const d of devices) {
    console.log(`  ${d.platform.padEnd(8)} ${d.expoPushToken}  (${d.deviceName ?? "?"})`);
  }
  if (devices.length === 0) return;

  const messages = devices.map((d) => ({
    to: d.expoPushToken,
    title: "DIAG",
    body: "diagnostic push",
    sound: "default",
    priority: "high",
    channelId: "default",
    data: { type: "SYSTEM" },
  }));

  const res = await fetch(EXPO_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(messages),
  });

  console.log(`\nHTTP ${res.status}`);
  const text = await res.text();
  console.log("=== HAM EXPO YANITI ===");
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
