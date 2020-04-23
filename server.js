const http = require('http');
const canonicalize = require('./canonicalize');

const createServer = async (options) => {

  const {port, connectDB, disconnectDB, insertIntoDB} = options;

  const client = await connectDB({ fake: true });

  const requestHandler = (req, resp) => {
    const logEntry = () => `${(new Date()).toString()} ${req.method} ${req.url}`;

    console.log(logEntry());

    switch (req.url) {
      case "/api/logs":
        if (req.method === "POST") {
          const timestamp = Math.round(Date.now() / 1000);
          let data = [];
          req.on("data", chunk => data.push(chunk));
          req.on("end", async () => {
            data = data.join("");
            try {
              result = await insertIntoDB(client, canonicalize(JSON.parse(data), timestamp), data);
              resp.statusCode = 201;
              resp.setHeader("Content-Type", "application/json");
              resp.end(JSON.stringify(result));
            } catch (e) {
              resp.statusCode = 500;
              resp.end(`Unable to parse to JSON: ${data}`);
              console.error(`${logEntry()}: ${e.toString()}`);
            }
          })
        } else {
          resp.statusCode = 404;
          resp.end("Only POSTs to /api/logs are allowed");
        }
        break;

      case "/favicon.ico":
        resp.statusCode = 404;
        resp.end("favicon.ico not supported");
        break;

      default:
        resp.end("log-ingester")
        break;
    }
  }

  const server = http.createServer(requestHandler)
  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    server.close(() => {
      console.error("HTTP server closed, disconnecting from database");
      disconnectDB(client);
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => {
    console.error("SIGTERM signal received! Shutting down");
    shutdown();
  });

  process.on("SIGINT", () => {
    console.error("SIGINT signal received! Shutting down");
    shutdown();
  });

  return server;
}

module.exports = createServer;