const request = require("request-promise");

const { getTestPool } = require("./test-helpers");
const { DB } = require("./db");
const { shutdownServer, createServer } = require("./server");
const { getTimestamp } = require("./timestamp");
const { getValidBody } = require("./test-helpers");

describe("server", () => {

  it("fails without the required options", () => {
    expect.assertions(1);
    return expect(createServer()).rejects.toHaveProperty("message", "Missing required port option!");
  });

  describe("createServer", () => {
    const port = 12345;
    let server;
    let client;
    let serverId;
    let db;

    const url = (suffix) => `http://localhost:${port}${suffix}`;

    beforeAll(async () => {
      pool = getTestPool();
      try {
        result = await createServer({ port, pool });
      } catch (e) { console.error(e) }
      server = result.server;
      client = result.client;
      serverId = result.serverId;
      db = result.db;
    });

    it("returns 404 for homepage", () => {
      return expect(request(url("/"))).rejects.toHaveProperty("message", `404 - "Sorry, the requested page (/) was not found!"`);
    });

    it("returns 404 for favicon.ico", () => {
      return expect(request(url("/favicon.ico"))).rejects.toHaveProperty("message", `404 - "Sorry, the requested page (/favicon.ico) was not found!"`);
    });

    it("returns 404 for any random page", () => {
      const page = `/foo/bar/baz`;
      return expect(request(url(page))).rejects.toHaveProperty("message", `404 - "Sorry, the requested page (${page}) was not found!"`);
    });

    it("fails on GETs to /api/logs", () => {
      return expect(request(url("/api/logs"))).rejects.toHaveProperty("message", `404 - "Only POSTs to /api/logs are allowed"`);
    });

    it("fails on POSTs to /api/logs with an invalid JSON body", () => {
      return expect(request({method: "POST", uri: url("/api/logs"), body: "*** invalid json ***"})).rejects.toHaveProperty("message", `500 - "Unable to parse body: SyntaxError: Unexpected token * in JSON at position 0"`);
    });

    it("succeeds on POSTs to /api/logs with an valid JSON body", async () => {
      const timestamp = getTimestamp();
      const body = getValidBody(timestamp);
      const result1 = await request({method: "POST", uri: url("/api/logs"), body, json: true});
      const result2 = await request({method: "POST", uri: url("/api/logs"), body, json: true});
      expect(result1.id).toEqual(1);
      expect(result2.id).toEqual(2);
    });

    it("returns pong on the /ping page", async () => {
      const result = await request(url("/ping"));
      expect(result).toContain("pong");
    });

    it("returns stats on the /stats page", async () => {
      const result = JSON.parse(await request(url("/stats")));
      const startedAt = result.startedAt;
      const lastTenRequests = result.lastTenRequests;
      const lastTenFailedParses = result.lastTenFailedParses;
      const lastTenFileNotFound = result.lastTenFileNotFound;
      // the following fields have dates in them we can't test for equality
      delete result.startedAt;
      delete result.lastTenRequests;
      delete result.lastTenFailedParses;
      delete result.lastTenFileNotFound;
      // containerInfo is tested in its own unit test
      delete result.containerInfo;
      expect(result).toEqual({
        serverId,
        dbInfo: {
          logsTable: {
            maxId: 3,
          },
          pool: {
            idleCount: 0,
            totalCount: 1,
            waitingCount: 0,
          }
        },
        allRequestsStats: {
          allowedRequests: 5,
          fileNotFound: 4,
          total: 9
        },
        allowedRequestsStats: {
          "POST /api/logs": {
            total: 3,
            failedParses: 1,
            inserts: 2,
            bytes: 694,
            applications: {
              application: {
                total: 2,
                inserts: 2,
                bytes: 674
              }
            }
          },
          "GET /stats": {
            total: 1
          },
          "GET /ping": {
            total: 1
          },
        }
      });

      expect(startedAt).not.toBe(undefined);

      const reqs = lastTenRequests.map((req) => req.match(/ ((GET|POST) (.+))$/)[1]);
      expect(lastTenRequests.length).toBe(9);
      expect(lastTenRequests.length).toBe(reqs.length);
      expect(reqs).toEqual([ 'GET /', 'GET /favicon.ico', 'GET /foo/bar/baz', 'GET /api/logs', 'POST /api/logs (20 bytes)', 'POST /api/logs (337 bytes)', 'POST /api/logs (337 bytes)', 'GET /ping', 'GET /stats' ]);

      const parses = lastTenFailedParses.map((parse) => parse.match(/\) (.+)$/)[1]);
      expect(lastTenFailedParses.length).toBe(1);
      expect(lastTenFailedParses.length).toBe(parses.length);
      expect(parses[0]).toEqual('SyntaxError: Unexpected token * in JSON at position 0 (*** invalid json ***)')

      const notFoundReqs = lastTenFileNotFound.map((req) => req.match(/ ((GET|POST) (.+))$/)[1]);
      expect(lastTenFileNotFound.length).toBe(4);
      expect(lastTenFileNotFound.length).toBe(notFoundReqs.length);
      expect(notFoundReqs).toEqual([ 'GET /', 'GET /favicon.ico', 'GET /foo/bar/baz', 'GET /api/logs' ]);
    });

    afterAll(async () => {
      try {
        await shutdownServer({server, db, exit: false});
      } catch (e) { console.error(e) }
    });

  })

});