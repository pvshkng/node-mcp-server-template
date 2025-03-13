const fastify = require("fastify")({ logger: true });
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");

// Initialize MCP Server
const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});


server.tool(
  "isPrime",
  "check if number is prime",
  {
    input: z.number(),
  },
  async ({ input }) => {
    console.log("function isPrime executed in fastify");
    // check if input is prime
    function isPrime(num) {
      var sqrtnum = Math.floor(Math.sqrt(num));
      var prime = num != 1;
      for (var i = 2; i < sqrtnum + 1; i++) {
        // sqrtnum+1
        if (num % i == 0) {
          prime = false;
          break;
        }
      }
      return prime;
    }

    return {
      content: [
        {
          type: "text",
          text:
            "The number " +
            input +
            " is " +
            (isPrime(input) ? "prime" : "not prime"),
        },
      ],
    };
  }
);

let transport = null;

// Root route
fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

// SSE route
fastify.get("/sse", async (request, reply) => {
  console.log("SSE connection established");

  // Set appropriate headers for SSE
  /* reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }); */

  try {
    // Create transport, passing the response object
    transport = new SSEServerTransport("/sse", reply.raw);
    console.log("SSE transport created successfully");
    server.connect(transport);
  } catch (error) {
    console.error("Error creating SSE transport:", error);
    reply.code(500).send();
    return;
  }

  // Handle client disconnection
  request.raw.on("close", () => {
    console.log("SSE connection closed");
    transport = null;
  });
});

// POST route for messages
fastify.post("/sse", async (request, reply) => {
  console.log("Received POST to /sse");
  console.log("POST body:", JSON.stringify(request.body, null, 2));

  if (!transport) {
    console.error("Transport not initialized");
    return reply.status(500).send({ error: "SSE transport not initialized" });
  }

  try {
    console.log("Handling POST message...");
    // Pass the parsed request body to handlePostMessage
    await transport.handlePostMessage(request.raw, reply.raw, request.body);
    console.log("POST message handled successfully");
  } catch (error) {
    console.error("Error handling POST:", error);
    console.error("Error stack:", error.stack);
    return reply.status(500).send({ error: error.message });
  }
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
    console.log(`Server is running on http://localhost:3001`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
