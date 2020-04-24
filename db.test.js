const { connectDB, disconnectDB, insertIntoDB } = require("./db");
const { canonicalize } = require("./canonicalize");
const { getTimestamp } = require("./timestamp");
const { getFakeClient, getValidBody } = require("./test-helpers");

describe("db", () => {

  describe("connect", () => {
    it("throws an error on connect without a connection string", () => {
      expect.assertions(1);
      return expect(connectDB()).rejects.toHaveProperty("message", "Missing RDS_DATABASE_URL environment variable")
    });

    it("connects with a fake client", async () => {
      const fakeClient = getFakeClient();
      const client = await connectDB({fakeClient});
      expect(client).toEqual(fakeClient);
    })
  });

  describe("disconnect", () => {
    it("doesn't throw error when no client it passed", async () => {
      const result = await disconnectDB();
      expect(result).toEqual(undefined)
    });

    it("disconnects with a client", async () => {
      const fakeClient = getFakeClient();
      const result = await disconnectDB(fakeClient);
      expect(result).toEqual(undefined)
      expect(fakeClient.end).toHaveBeenCalled()
    })
  });

  describe("insert", () => {
    it("calls client query", async () => {
      const fakeClient = getFakeClient();
      const timestamp = getTimestamp();
      const body = getValidBody(timestamp);
      const entry = canonicalize(body, timestamp);

      const result = await insertIntoDB(fakeClient, entry, body);

      expect(result).toEqual({id: 1})
      expect(fakeClient.query).toHaveBeenCalledWith(
        "INSERT INTO logs (session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint) VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8, $9, $10) RETURNING id",
        ["session", "username", "application", "activity", "event", timestamp, {"bam": "boom", "foo": {"bar": {"baz": true}}}, {"other": "other", "some": "some", "thing": {"that": {"is": {"in": {"the": {"data": true}}}}}}, "event_value", "run_remote_endpoint"]
      );
    })
  });
});