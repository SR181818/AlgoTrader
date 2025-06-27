import { configDotenv } from "dotenv";
configDotenv();

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import authRoutes from "./authRoutes";
import liveSimulationRoutes from "./liveSimulationRoutes";

const app = new Hono();

app.route("/api/auth", authRoutes);
app.route("/api/live-simulation", liveSimulationRoutes);

export default app;