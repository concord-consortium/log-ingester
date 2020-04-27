const { DB } = require("./db");
const { canonicalize } = require("./canonicalize");
const { getTimestamp } = require("./timestamp");
const { getTestPool, getValidBody } = require("./test-helpers");

describe("db", () => {

  let db;
  let pool;
  beforeEach(() => {
    pool = getTestPool();
    db = new DB({ pool });
  })

  describe("constructor", () => {
    it("saves the passed in options", () => {
      expect(db.options).toEqual({ pool });
    })
  })

  describe("insert", () => {
    it("throws an error on connect without a connection string", () => {
      const realDB = new DB();
      expect.assertions(1);
      return expect(realDB.insert({})).rejects.toHaveProperty("message", "Missing RDS_DATABASE_URL environment variable")
    });

    it("calls client query", async () => {
      const timestamp = getTimestamp();
      const entry = canonicalize(getValidBody(timestamp), timestamp);

      const result = await db.insert(entry);

      expect(result.id).toEqual(1)
      expect(result._client.query).toHaveBeenCalledWith(
        "INSERT INTO json_logs (id, session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint) VALUES (nextval('next_json_logs_id'), $1, $2, $3, $4, $5, to_timestamp($6), $7, $8, $9, $10) RETURNING id",
        ["session", "username", "application", "activity", "event", timestamp, {"bam": "boom", "foo": {"bar": {"baz": true}}}, {"other": "other", "some": "some", "thing": {"that": {"is": {"in": {"the": {"data": true}}}}}}, "event_value", "run_remote_endpoint"]
      );
      expect(result._client.release).toHaveBeenCalled();
    })
  });

  describe("disconnect", () => {

    it("does not create a pool or call pool.end() if there was no query", async () => {
      db.disconnect();
      expect(db.pool).toBe(undefined);
      expect(pool.end).not.toHaveBeenCalled();
    })

    it("creates a pool and calls pool.end() if there is a query", async () => {
      const timestamp = getTimestamp();
      const entry = canonicalize(getValidBody(timestamp), timestamp);
      await db.insert(entry);
      db.disconnect();
      expect(db.pool).toEqual(pool);
      expect(pool.end).toHaveBeenCalled();
    })

  });
});