const { execSync } = require("child_process");

const schemaSource = process.argv[2] || "open-api/schema.json";
const outputPath = "types/index.ts";

try {
  execSync(`npx openapi-typescript ${schemaSource} -o ${outputPath}`, {
    stdio: "inherit",
  });
} catch (error) {
  console.error("Failed to generate TypeScript types from OpenAPI schema.");
  process.exit(1);
}
