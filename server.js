const http = require('http');
const { canonicalize } = require('./canonicalize');
const { getContainerInfo } = require("./get-container-info");
const { DB } = require("./db");

const containerInfo = getContainerInfo();

const shutdownServer = (options) => {
  const {server, db, exit, log} = options;
  const logMessage = log ? (message) => console.log(message) : () => undefined;

  return new Promise(resolve => {
    if (server.shuttingDown) {
      return resolve();
    }
    server.shuttingDown = true;

    logMessage("Shutting down server...");
    server.close(() => {
      logMessage("HTTP server closed, disconnecting from database");
      db.disconnect()
      if (exit) {
        logMessage("Exiting...");
        process.exit(0);
      }
      resolve();
    });
  });
}

const createServer = async (options) => {

  options = options || {};
  const {port, pool, log} = options;
  if (!port) {
    throw new Error("Missing required port option!");
  }

  const startedAt = (new Date()).toString();
  const serverId = Math.round(Math.random() * 100000000);
  const allRequestsStats = {
    allowedRequests: 0,
    fileNotFound: 0,
    total: 0,
  };
  const allowedRequestsStats = {};
  const lastTenRequests = [];
  const lastTenFailedParses = [];
  const lastTenFileNotFound = [];

  const db = new DB({ pool });

  let requestId = 0;

  const allowedRequests = ["GET /ping", "GET /stats", "POST /api/logs"]

  const truncate = (s) => s.length < 128 ? s : `${s.substr(0, 128)}... (TRUNCATED)`;

  // TODO: determine max POST body size and time limit
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
    // allow CORS POSTs to the logs (the whole point of this app)
    if (req.method === "OPTIONS") {
      if (req.url === "/api/logs") {
        resp.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": 60 * 60 * 24
        });
        resp.end();
      } else {
        resp.statusCode = 405;
        resp.end(`OPTIONS is not allowed for ${req.url}`);
      }
      return;
    }

    requestId++;

    getBody(req).then(body => {
      const formatStatsRequest = () => {
        const info = {requestId};
        if (body !== undefined) {
          info.bytes = body.length
        }
        return `${(new Date()).toString()} ${truncate(req.method)} ${truncate(req.url)} ${JSON.stringify(info)}`;
      }
      const logRequest = (data) => {
        const baseInfo = {statusCode: resp.statusCode, serverId, requestId, method: req.method, url: req.url};
        if (body !== undefined) {
          baseInfo.bytes = body.length
        }
        console.log(JSON.stringify(Object.assign({}, baseInfo, data || {}, {stats: getStatsForLog()})));
      }
      const getStatsForLog = (includeIds) => {
        let poolInfo;
        try {
          poolInfo = db.getPoolInfo();
        } catch (err) {
          poolInfo = {error: err.toString()}
        }
        const dbInfo = { pool: poolInfo }
        return {startedAt, dbInfo, allRequestsStats, allowedRequestsStats}
      }

      allRequestsStats.total++;

      while (lastTenRequests.length > 9) {
        lastTenRequests.shift();
      }
      lastTenRequests.push(formatStatsRequest());

      let stats;
      const requestKey = `${req.method.toUpperCase()} ${req.url}`;
      if (allowedRequests.indexOf(requestKey) !== -1) {
        stats = allowedRequestsStats[requestKey] = allowedRequestsStats[requestKey] || {};
        stats.total = stats.total || 0;
        stats.total++;
        allRequestsStats.allowedRequests++;
      }

      switch (req.url) {
        case "/ping":
          resp.end(`pong: ${(new Date()).toString()}`);
          break;

        case "/stats":
          const sendStats = (dbInfo) => {
            delete dbInfo._client;
            resp.setHeader("Content-Type", "application/json");
            resp.end(JSON.stringify({serverId, requestId, startedAt, dbInfo, allRequestsStats, allowedRequestsStats, lastTenRequests, lastTenFailedParses, lastTenFileNotFound, containerInfo}, null, 2));
          }
          db.getInfo().then(info => sendStats(info)).catch(err => sendStats({ error: err.toString() }))
          break;

        case "/api/logs":
          if (req.method === "POST") {
            const timestamp = Math.round(Date.now() / 1000);
            let json;

            stats.bytes = stats.bytes || 0;
            stats.bytes += body.length;

            try {
              json = JSON.parse(body);
            } catch (err) {
              resp.statusCode = 500;
              resp.end(`Unable to parse body: ${err.toString()}`);
              stats.failedParses = stats.failedParses || 0;
              stats.failedParses++;
              while (lastTenFailedParses.length > 9) {
                lastTenFailedParses.shift();
              }
              lastTenFailedParses.push(`${(new Date()).toString()} ${err.toString()} (${truncate(body)})`);
              if (log) {
                logRequest({errorType: "PARSE_ERROR", error: err.toString(), body});
              }
              return;
            }

            const entry = canonicalize(json, timestamp);
            const application = entry.application || "NONE"
            stats.applications = stats.applications || {};
            const appStats = stats.applications[application] = stats.applications[application] || {total: 0, bytes: 0};
            appStats.total++;
            appStats.bytes += body.length;

            db.insert(entry).then(result => {
              resp.statusCode = 201;
              resp.setHeader("Content-Type", "application/json");
              resp.end(JSON.stringify({id: result.id, size: body.length}));
              stats.inserts = stats.inserts || 0;
              stats.inserts++;
              appStats.inserts = appStats.inserts || 0;
              appStats.inserts++;
              if (log) {
                logRequest()
              }
            }).catch(err => {
              resp.statusCode = 500;
              resp.end(`Unable to insert into db: ${err.toString()}`);
              stats.failedInserts = stats.failedInserts || 0;
              stats.failedInserts++;
              appStats.failedInserts = appStats.failedInserts || 0;
              appStats.failedInserts++;
              if (log) {
                logRequest({errorType: "INSERT_ERROR", error: err.toString(), entry});
              }
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
        lastTenFileNotFound.push(formatStatsRequest());
      }

      // wait to log the POST /api/logs until after the insert
      const skipInitialLog = (req.url === "/api/logs") && (req.method === "POST");
      if (log && !skipInitialLog) {
        logRequest();
      }
    })
  }

  const server = http.createServer(requestHandler)

  process.on("SIGTERM", () => {
    console.error("SIGTERM signal received! Shutting down");
    shutdownServer({server, db, log, exit: true});
  });

  process.on("SIGINT", () => {
    console.error("SIGINT signal received! Shutting down");
    shutdownServer({server, db, log, exit: true});
  });

  return new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) {
        reject(err);
      }
      resolve({server, db, serverId});
    });
  })
}

module.exports = {
  createServer,
  shutdownServer
};