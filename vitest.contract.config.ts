import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/bookingOutboundGate.test.ts",
      "src/lib/appNavigationContracts.test.ts",
      "src/lib/cleaningEmailCalendarContracts.test.ts",
      "src/lib/maintenanceSmsContracts.test.ts",
      "src/lib/reservationObservationIntakeContract.test.ts",
      "src/lib/reservationReviewContracts.test.ts",
      "src/lib/roleRouting.test.ts",
    ],
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
