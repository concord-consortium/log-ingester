const http = require('http');
const { canonicalize } = require('./canonicalize');
const { getContainerInfo } = require("./get-container-info");

const containerInfo = getContainerInfo();

const shutdownServer = (options) => {
  const {server, disconnectDB, client, exit, log} = options;
  const logMessage = log ? (message) => console.log(message) : () => undefined;

  return new Promise(resolve => {
    if (server.shuttingDown) {
      resolve();
    }
    server.shuttingDown = true;

    logMessage("Shutting down server...");
    server.close(async () => {
      logMessage("HTTP server closed, disconnecting from database");
      await disconnectDB(client);
      if (exit) {
        logMessage("Exiting...");
        process.exit(0);
      }
      resolve();
    });
  });
}

const createServer = async (options) => {

  // all options are required expect for fakeClient
  options = options || {};
  const {port, connectDB, disconnectDB, insertIntoDB, fakeClient, log} = options;
  if (!port || !connectDB || !disconnectDB || !insertIntoDB) {
    throw new Error("Missing required options!");
  }

  const startedAt = (new Date()).toString();
  const serverId = Math.round(Math.random() * 100000000);
  const allRequestsStats = {
    allowedRequests: 0,
    fileNotFound: 0,
    total: 0,
  };
  const allowedRequestStats = {};
  const lastTenRequests = [];
  const lastTenFailedParses = [];
  const lastTenFileNotFound = [];

  const client = await connectDB({ fakeClient });

  const allowedRequests = ["GET /stats", "POST /api/logs"]

  const truncate = (s) => s.length < 128 ? s : `${s.substr(0, 128)}... (TRUNCATED)`;

  const getBody = async (req) => {
    return new Promise((resolve) => {
      if ((req.method === "POST") && (req.url === "/api/logs")) {
        let data = [];
        req.on("data", chunk => data.push(chunk));
        req.on("end", () => {
          resolve(data.join(""));
        });
      } else {
        resolve(undefined);
      }
    })
  }

  const requestHandler = (req, resp) => {
    getBody(req).then(body => {
      const logEntry = () => {
        return `${(new Date()).toString()} ${truncate(req.method)} ${truncate(req.url)}${body !== undefined ? ` (${body.length} bytes)` : ""}`;
      }

      allRequestsStats.total++;

      while (lastTenRequests.length > 9) {
        lastTenRequests.shift();
      }
      lastTenRequests.push(logEntry());
      if (log) {
        console.log(logEntry());
      }

      let stats;
      const requestKey = `${req.method.toUpperCase()} ${req.url}`;
      if (allowedRequests.indexOf(requestKey) !== -1) {
        stats = allowedRequestStats[requestKey] = allowedRequestStats[requestKey] || {};
        stats.total = stats.total || 0;
        stats.total++;
        allRequestsStats.allowedRequests++;
      }

      switch (req.url) {
        case "/stats":
          resp.setHeader("Content-Type", "application/json");
          resp.end(JSON.stringify({serverId, startedAt, allRequestsStats, allowedRequestsStats: allowedRequestStats, lastTenRequests, lastTenFailedParses, lastTenFileNotFound, containerInfo}, null, 2));
          break;

        case "/api/logs":
          if (req.method === "POST") {
            const timestamp = Math.round(Date.now() / 1000);
            let json;

            stats.bytes = stats.bytes || 0;
            stats.bytes += body.length;

            try {
              json = JSON.parse(body);
            } catch (e) {
              resp.statusCode = 500;
              resp.end(`Unable to parse body: ${e.toString()}`);
              if (log) {
                console.error(`${logEntry()}: ${e.toString()}`);
              }
              stats.failedParses = stats.failedParses || 0;
              stats.failedParses++;
              while (lastTenFailedParses.length > 9) {
                lastTenFailedParses.shift();
              }
              lastTenFailedParses.push(`${(new Date()).toString()} ${e.toString()} (${truncate(body)})`);
              return;
            }

            const entry = canonicalize(json, timestamp);
            const application = entry.application || "NONE"
            stats.applications = stats.applications || {};
            const appStats = stats.applications[application] = stats.applications[application] || {total: 0, bytes: 0};
            appStats.total++;
            appStats.bytes += body.length;

            insertIntoDB(client, entry, body).then(result => {
              resp.statusCode = 201;
              resp.setHeader("Content-Type", "application/json");
              resp.end(JSON.stringify(result));
              stats.inserts = stats.inserts || 0;
              stats.inserts++;
              appStats.inserts = appStats.inserts || 0;
              appStats.inserts++;
            }).catch(err => {
              resp.statusCode = 500;
              resp.end(`Unable to insert into db: ${e.toString()}`);
              if (log) {
                console.error(`${logEntry()}: ${err.toString()}`);
              }
              stats.failedInserts = stats.failedInserts || 0;
              stats.failedInserts++;
              appStats.failedInserts = appStats.failedInserts || 0;
              appStats.failedInserts++;
            })
          } else {
            resp.statusCode = 404;
            resp.end("Only POSTs to /api/logs are allowed");
          }
          break;

        default:
          resp.statusCode = 404;
          resp.end(`Sorry, the requested page (${req.url}) was not found!`);
          break;
      }

      if (resp.statusCode === 404) {
        allRequestsStats.fileNotFound++;
        while (lastTenFileNotFound.length > 9) {
          lastTenFileNotFound.shift();
        }
        lastTenFileNotFound.push(logEntry());
      }
    })
  }

  const server = http.createServer(requestHandler)

  process.on("SIGTERM", () => {
    console.error("SIGTERM signal received! Shutting down");
    shutdownServer({server, disconnectDB, client, log, exit: true});
  });

  process.on("SIGINT", () => {
    console.error("SIGINT signal received! Shutting down");
    shutdownServer({server, disconnectDB, client, log, exit: true});
  });

  return new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) {
        reject(err);
      }
      resolve({server, client, serverId});
    });
  })
}

module.exports = {
  createServer,
  shutdownServer
};