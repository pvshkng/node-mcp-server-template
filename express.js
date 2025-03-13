const express = require("express");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Initialize MCP Server
const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

// Define the "isOdd" tool
server.tool(
  "isOdd",
  "check if number is odd",
  {
    input: z.number(),
  },
  async ({ input }) => {
    console.log("function is Odd executed in express server");
    return {
      content: [
        {
          type: "text",
          text:
            "The number " + input + " is " + (input % 2 === 0 ? "even" : "odd"),
        },
      ],
    };
  }
);

let transport = null;

// Root route
app.get("/", (req, res) => {
  res.json({ hello: "world" });
});

// SSE route
app.get("/sse", (req, res) => {
  console.log("SSE connection established");

  // Set appropriate headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Create transport, passing the response object
    transport = new SSEServerTransport("/sse", res);
    console.log("SSE transport created successfully");
    server.connect(transport);
  } catch (error) {
    console.error("Error creating SSE transport:", error);
    res.status(500).end();
    return;
  }

  // Handle client disconnection
  req.on("close", () => {
    console.log("SSE connection closed");
    transport = null;
  });
});

// POST route for messages
app.post("/sse", async (req, res) => {
  console.log("Received POST to /sse");
  console.log("POST body:", JSON.stringify(req.body, null, 2));

  if (!transport) {
    console.error("Transport not initialized");
    return res.status(500).json({ error: "SSE transport not initialized" });
  }

  try {
    console.log("Handling POST message...");
    // Pass the parsed request body to handlePostMessage
    await transport.handlePostMessage(req, res, req.body);
    console.log("POST message handled successfully");
  } catch (error) {
    console.error("Error handling POST:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
