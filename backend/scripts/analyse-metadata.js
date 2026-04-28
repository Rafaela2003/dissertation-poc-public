import { PrismaClient } from "@prisma/client";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function analyseMetadata() {
  console.log("Metadata Analysis Report\n");

  const interactions = await prisma.interaction.findMany({
    orderBy: { timestamp: "asc" },
  });

  console.log(`Total interactions: ${interactions.length}\n`);

  // Calculate statistics
  const stats = {
    total: interactions.length,
    successful: interactions.filter((i) => !i.errorOccurred).length,
    failed: interactions.filter((i) => i.errorOccurred).length,

    // Token usage
    totalPromptTokens: interactions.reduce(
      (sum, i) => sum + (i.promptTokens || 0),
      0,
    ),
    totalResponseTokens: interactions.reduce(
      (sum, i) => sum + (i.responseTokens || 0),
      0,
    ),
    totalTokens: interactions.reduce((sum, i) => sum + (i.totalTokens || 0), 0),
    avgPromptTokens: 0,
    avgResponseTokens: 0,

    // Response times
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,

    // Models used
    modelBreakdown: {},

    // Personas
    personaBreakdown: {},

    // Leakage
    withLeakage: 0,
    leakageBySeverity: { none: 0, low: 0, medium: 0, high: 0 },
  };

  // Calculate averages and breakdowns
  let totalResponseTime = 0;

  interactions.forEach((interaction) => {
    // Token averages
    if (interaction.promptTokens) {
      stats.avgPromptTokens = stats.totalPromptTokens / stats.total;
      stats.avgResponseTokens = stats.totalResponseTokens / stats.total;
    }

    // Response time stats
    if (interaction.responseTime) {
      totalResponseTime += interaction.responseTime;
      stats.minResponseTime = Math.min(
        stats.minResponseTime,
        interaction.responseTime,
      );
      stats.maxResponseTime = Math.max(
        stats.maxResponseTime,
        interaction.responseTime,
      );
    }

    // Model breakdown
    const model = interaction.modelUsed || "unknown";
    stats.modelBreakdown[model] = (stats.modelBreakdown[model] || 0) + 1;

    // Persona breakdown
    if (interaction.personaId) {
      stats.personaBreakdown[interaction.personaId] =
        (stats.personaBreakdown[interaction.personaId] || 0) + 1;
    }

    // Leakage stats
    if (interaction.leakageFlags) {
      const leakage = JSON.parse(interaction.leakageFlags);
      if (leakage.overall_leakage) {
        stats.withLeakage++;
        stats.leakageBySeverity[leakage.combined_severity]++;
      }
    }
  });

  stats.avgResponseTime = totalResponseTime / stats.total;

  // Print report
  console.log("Performance Metrics");
  console.log(
    `Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`,
  );
  console.log(`\nResponse Times:`);
  console.log(`  Average: ${stats.avgResponseTime.toFixed(0)} ms`);
  console.log(
    `  Min: ${stats.minResponseTime === Infinity ? "N/A" : stats.minResponseTime + " ms"}`,
  );
  console.log(
    `  Max: ${stats.maxResponseTime === 0 ? "N/A" : stats.maxResponseTime + " ms"}`,
  );

  console.log("\nToken Usage");
  console.log(
    `Total Prompt Tokens: ${stats.totalPromptTokens.toLocaleString()}`,
  );
  console.log(
    `Total Response Tokens: ${stats.totalResponseTokens.toLocaleString()}`,
  );
  console.log(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`Avg Prompt Tokens: ${stats.avgPromptTokens.toFixed(1)}`);
  console.log(`Avg Response Tokens: ${stats.avgResponseTokens.toFixed(1)}`);

  console.log("\nModels Used");
  Object.entries(stats.modelBreakdown).forEach(([model, count]) => {
    console.log(
      `  ${model}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`,
    );
  });

  console.log("\nPersona Distribution");
  Object.entries(stats.personaBreakdown)
    .sort((a, b) => a[0] - b[0])
    .forEach(([personaId, count]) => {
      console.log(
        `  Persona #${personaId}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`,
      );
    });

  console.log("\nPrivacy Leakage");
  console.log(
    `Interactions with leakage: ${stats.withLeakage} (${((stats.withLeakage / stats.total) * 100).toFixed(1)}%)`,
  );
  console.log(`By Severity:`);
  console.log(`  High:   ${stats.leakageBySeverity.high}`);
  console.log(`  Medium: ${stats.leakageBySeverity.medium}`);
  console.log(`  Low:    ${stats.leakageBySeverity.low}`);
  console.log(`  None:   ${stats.leakageBySeverity.none}`);

  // Export detailed report
  const report = {
    generated_at: new Date().toISOString(),
    summary: stats,
    interactions: interactions.map((i) => ({
      id: i.id,
      sessionId: i.sessionId,
      timestamp: i.timestamp,
      promptLength: i.userPrompt?.length || 0,
      responseLength: i.botResponse?.length || 0,
      promptTokens: i.promptTokens,
      responseTokens: i.responseTokens,
      totalTokens: i.totalTokens,
      modelUsed: i.modelUsed,
      responseTime: i.responseTime,
      personaId: i.personaId,
      errorOccurred: i.errorOccurred,
      errorMessage: i.errorMessage,
      leakage: i.leakageFlags ? JSON.parse(i.leakageFlags) : null,
    })),
  };

  fs.writeFileSync(
    "./data/metadata-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log("\nDetailed metadata report saved to data/metadata-report.json");

  // Also create CSV for statistical analysis
  const csv = [
    "Timestamp,SessionID,PersonaID,PromptTokens,ResponseTokens,TotalTokens,ResponseTime(ms),ModelUsed,ErrorOccurred,HasLeakage,LeakageSeverity",
    ...interactions.map((i) => {
      const leakage = i.leakageFlags ? JSON.parse(i.leakageFlags) : null;
      return `"${i.timestamp}","${i.sessionId}",${i.personaId || "NULL"},${i.promptTokens || 0},${i.responseTokens || 0},${i.totalTokens || 0},${i.responseTime || 0},"${i.modelUsed || "unknown"}",${i.errorOccurred},${leakage?.overall_leakage || false},"${leakage?.combined_severity || "none"}"`;
    }),
  ].join("\n");

  fs.writeFileSync("./data/metadata-report.csv", csv);
  console.log("CSV report saved to data/metadata-report.csv");

  await prisma.$disconnect();
}

analyseMetadata();
