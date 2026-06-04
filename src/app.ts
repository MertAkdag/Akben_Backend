import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { jwtAuth } from "./middlewares/jwtAuth.middleware";
import { storyGroupsRouter } from "./modules/story-groups/story-groups.routes";
import { storiesRouter } from "./modules/stories/stories.routes";
import { adminStoriesRouter } from "./modules/stories/stories.admin-routes";
import { storyViewsRouter } from "./modules/story-views/story-views.routes";
import { flashDealsRouter } from "./modules/flash-deals/flash-deals.routes";
import { adminFlashDealsRouter } from "./modules/flash-deals/flash-deals.admin-routes";
import homepageRouter from "./modules/homepage/homepage.controller";
import catalogLandingRouter from "./modules/catalog/catalog-landing.controller";
import catalogOverlayAdminRouter from "./modules/catalog/catalog-overlay.admin-controller";
import inquiryRouter from "./modules/inquiries/inquiries.controller";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { adminNotificationsRouter } from "./modules/notifications/notifications.admin-routes";
import { startFlashDealCron } from "./modules/flash-deals/flash-deals.cron";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { adminAuth } from "./middlewares/adminAuth.middleware";
import os from "os";
import fs from "fs";
import path from "path";
import { getStoryMediaRuntimeConfig } from "./config/storyMedia";

const app = express();
const mediaRuntime = getStoryMediaRuntimeConfig();

fs.mkdirSync(mediaRuntime.storageDir, { recursive: true });
fs.mkdirSync(mediaRuntime.tmpDir, { recursive: true });

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}


app.use(globalLimiter);

app.get("/health", (_req, res) => {
  const memoryUsage = process.memoryUsage();

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  res.status(200).json({
    success: true,
    status: "healthy",

    service: {
      name: "story-api",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      timestamp: new Date().toISOString(),
    },

    system: {
      platform: os.platform(),
      architecture: os.arch(),
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model || "unknown",
      cpuCores: os.cpus().length,
      loadAverage: {
        "1m": os.loadavg()[0],
        "5m": os.loadavg()[1],
        "15m": os.loadavg()[2],
      },
    },

    memory: {
      system: {
        total: formatBytes(totalMemory),
        free: formatBytes(freeMemory),
        used: formatBytes(usedMemory),
        usagePercent: Number(((usedMemory / totalMemory) * 100).toFixed(2)),
      },
      process: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
      },
    },

    runtime: {
      nodeVersion: process.version,
      pid: process.pid,
      cwd: process.cwd(),
    },
  });
});

app.use(
  "/media",
  express.static(mediaRuntime.storageDir, {
    immutable: true,
    maxAge: "365d",
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".m3u8") res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      if (ext === ".ts") res.setHeader("Content-Type", "video/mp2t");
    },
  }),
);

// Express 5: iç içe Router + tek /v1 mount bazı isteklerde eşleşmiyor; düz mount kullan.
app.use("/v1/story-groups", jwtAuth, storyGroupsRouter);
app.use("/v1/stories", jwtAuth, storiesRouter);
app.use("/v1/admin", jwtAuth, adminStoriesRouter);
app.use("/v1/story-views", jwtAuth, storyViewsRouter);
app.use("/v1/flash-deals", jwtAuth, flashDealsRouter);
app.use("/v1/admin/flash-deals", jwtAuth, adminFlashDealsRouter); // TODO: adminAuth middleware eklenince değiştirilecek
app.use("/v1/homepage", jwtAuth, homepageRouter);
app.use("/v1/catalog", jwtAuth, catalogLandingRouter);
app.use("/v1/admin/catalog/overlays", jwtAuth, catalogOverlayAdminRouter); // TODO: adminAuth middleware eklenince güçlendir
app.use("/v1/inquiries", jwtAuth, inquiryRouter);
app.use("/v1/notifications", jwtAuth, notificationsRouter);
// Admin broadcast — jwtAuth + adminAuth (rol kontrolü). Diğer admin route'lar henüz korumasız (TODO).
app.use("/v1/admin/notifications", jwtAuth, adminAuth, adminNotificationsRouter);

// ── Cron Jobs ──
startFlashDealCron();

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
