import { createTRPCRouter } from "../trpc";
import { verificationDashboardRouter } from "./verification/dashboard";

export const verificationRouter = createTRPCRouter({
  dashboard: verificationDashboardRouter,
});