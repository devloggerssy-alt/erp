const fs = require("fs");
const path = require("path");

const collectionPath = process.argv[2] || "postman/collection.json";
const outputPath = "open-api/schema.json";

// ── Schema inference from JSON examples ─────────────────────────────

function inferSchema(value) {
  if (value === null || value === undefined) {
    return { type: "string", nullable: true };
  }
  if (typeof value === "boolean") {
    return { type: "boolean" };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return { type: "string", format: "date-time" };
    }
    return { type: "string" };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "array", items: {} };
    }
    return { type: "array", items: inferSchema(value[0]) };
  }
  if (typeof value === "object") {
    const properties = {};
    for (const [key, val] of Object.entries(value)) {
      properties[key] = inferSchema(val);
    }
    return { type: "object", properties };
  }
  return {};
}

// ── Path helpers ────────────────────────────────────────────────────

function extractPath(url) {
  const parts = url.path || [];
  const raw = "/" + parts.join("/");
  return raw.replace(/\{\{(\w+)\}\}/g, "{$1}");
}

function extractPathParams(apiPath) {
  const params = [];
  const re = /\{(\w+)\}/g;
  let m;
  while ((m = re.exec(apiPath)) !== null) {
    params.push({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  }
  return params;
}

// ── Request body ────────────────────────────────────────────────────

function buildRequestBody(body) {
  if (!body) return undefined;

  if (body.mode === "raw" && body.raw) {
    try {
      const parsed = JSON.parse(body.raw);
      return {
        required: true,
        content: {
          "application/json": {
            schema: inferSchema(parsed),
            example: parsed,
          },
        },
      };
    } catch {
      return {
        content: {
          "text/plain": { schema: { type: "string" } },
        },
      };
    }
  }

  if (body.mode === "formdata" && body.formdata) {
    const properties = {};
    for (const field of body.formdata) {
      properties[field.key] =
        field.type === "file"
          ? { type: "string", format: "binary" }
          : { type: "string" };
    }
    return {
      content: {
        "multipart/form-data": {
          schema: { type: "object", properties },
        },
      },
    };
  }

  return undefined;
}

// ── Response schemas ────────────────────────────────────────────────

function buildResponses(responses) {
  const out = {};

  if (!responses || responses.length === 0) {
    out["200"] = { description: "OK" };
    return out;
  }

  for (const resp of responses) {
    const code = String(resp.code || 200);
    const desc = resp.status || "OK";
    const entry = { description: desc };

    if (resp.body) {
      try {
        const parsed = JSON.parse(resp.body);
        entry.content = {
          "application/json": {
            schema: inferSchema(parsed),
            example: parsed,
          },
        };
      } catch {
        entry.content = {
          "text/plain": { schema: { type: "string" } },
        };
      }
    }

    out[code] = entry;
  }

  return out;
}

// ── Tree walker ─────────────────────────────────────────────────────

function processItem(item, tag, paths) {
  const req = item.request;
  if (!req) return;

  const method = req.method.toLowerCase();
  const apiPath = extractPath(req.url);
  const pathParams = extractPathParams(apiPath);

  if (!paths[apiPath]) paths[apiPath] = {};

  const operation = {
    tags: [tag],
    summary: item.name,
  };

  const reqBody = buildRequestBody(req.body);
  if (reqBody) operation.requestBody = reqBody;

  if (pathParams.length > 0) operation.parameters = pathParams;

  operation.responses = buildResponses(item.response);

  paths[apiPath][method] = operation;
}

function walkFolder(folder, paths, tag) {
  const currentTag = folder.name || tag;
  if (!folder.item) return;

  for (const child of folder.item) {
    if (child.item) {
      walkFolder(child, paths, currentTag);
    } else {
      processItem(child, currentTag, paths);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  const collection = JSON.parse(fs.readFileSync(collectionPath, "utf-8"));

  const tags = new Set();
  const paths = {};

  for (const folder of collection.item) {
    tags.add(folder.name);
    walkFolder(folder, paths, folder.name);
  }

  const spec = {
    openapi: "3.0.0",
    info: {
      title: collection.info.name || "API",
      description: collection.info.description || "",
      version: "1.0.0",
    },
    servers: [{ url: "http://{{base_url}}" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: Array.from(tags).map((name) => ({ name })),
    paths,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  console.log(`OpenAPI schema written to ${outputPath}`);
}

main();
