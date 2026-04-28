import { PrismaClient } from "@prisma/client";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function analyseLeakage() {
  console.log("Privacy Leakage Analysis\n");

  const interactions = await prisma.interaction.findMany({
    orderBy: { timestamp: "asc" },
  });

  console.log(`Total interactions: ${interactions.length}\n`);

  const stats = {
    total: interactions.length,
    with_leakage: 0,
    by_severity: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
    by_detection_method: {
      primary_only: 0,
      secondary_only: 0,
      both: 0,
      neither: 0,
    },
    by_type: {},
    primary_detections: 0,
    secondary_detections: 0,
  };

  interactions.forEach((interaction) => {
    const leakage = interaction.leakageFlags
      ? JSON.parse(interaction.leakageFlags)
      : null;

    if (leakage) {
      if (leakage.overall_leakage) {
        stats.with_leakage++;
      }

      stats.by_severity[leakage.combined_severity]++;

      // Count detection methods
      const primaryCount = leakage.user?.primary_count || 0;
      const secondaryCount = leakage.user?.secondary_count || 0;

      stats.primary_detections += primaryCount;
      stats.secondary_detections += secondaryCount;

      if (primaryCount > 0 && secondaryCount > 0) {
        stats.by_detection_method.both++;
      } else if (primaryCount > 0) {
        stats.by_detection_method.primary_only++;
      } else if (secondaryCount > 0) {
        stats.by_detection_method.secondary_only++;
      } else {
        stats.by_detection_method.neither++;
      }

      // Count by type
      [
        ...(leakage.user?.detections || []),
        ...(leakage.bot?.detections || []),
      ].forEach((detection) => {
        const type = detection.category || detection.subtype || detection.type;
        stats.by_type[type] = (stats.by_type[type] || 0) + 1;
      });
    }
  });

  console.log("Summary");
  console.log(
    `Interactions with leakage: ${stats.with_leakage} (${((stats.with_leakage / stats.total) * 100).toFixed(1)}%)`,
  );

  console.log("\nBy Severity:");
  console.log(`  Critical: ${stats.by_severity.critical}`);
  console.log(`  High:     ${stats.by_severity.high}`);
  console.log(`  Medium:   ${stats.by_severity.medium}`);
  console.log(`  Low:      ${stats.by_severity.low}`);
  console.log(`  None:     ${stats.by_severity.none}`);

  console.log("\nDetection Method Effectiveness:");
  console.log(`  Primary detections:   ${stats.primary_detections}`);
  console.log(`  Secondary detections: ${stats.secondary_detections}`);
  console.log(`  Both methods:         ${stats.by_detection_method.both}`);
  console.log(
    `  Primary only:         ${stats.by_detection_method.primary_only}`,
  );
  console.log(
    `  Secondary only:       ${stats.by_detection_method.secondary_only}`,
  );

  console.log("\nBy Detection Type:");
  Object.entries(stats.by_type)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  // Export report
  const report = {
    generated_at: new Date().toISOString(),
    statistics: stats,
    detailed_interactions: interactions
      .filter((i) => i.leakageFlags)
      .map((i) => ({
        id: i.id,
        sessionId: i.sessionId,
        timestamp: i.timestamp,
        userPrompt: i.userPrompt,
        botResponse: i.botResponse,
        leakage: JSON.parse(i.leakageFlags),
      })),
  };

  fs.writeFileSync(
    "./data/leakage-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log("\nDetailed report saved to data/leakage-report.json");

  await prisma.$disconnect();
}

analyseLeakage();
