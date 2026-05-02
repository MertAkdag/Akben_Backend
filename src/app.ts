import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { jwtAuth } from "./middlewares/jwtAuth.middleware";
import { storyGroupsRouter } from "./modules/story-groups/story-groups.routes";
import { storiesRouter } from "./modules/stories/stories.routes";
import { storyViewsRouter } from "./modules/story-views/story-views.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import os from "os";

const app = express();

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

// Express 5: iç içe Router + tek /v1 mount bazı isteklerde eşleşmiyor; düz mount kullan.
app.use("/v1/story-groups", jwtAuth, storyGroupsRouter);
app.use("/v1/stories", jwtAuth, storiesRouter);
app.use("/v1/story-views", jwtAuth, storyViewsRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
