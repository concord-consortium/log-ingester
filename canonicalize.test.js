const { canonicalize } = require("./canonicalize");
const { getTimestamp } = require("./timestamp");
const { getValidBody } = require("./test-helpers");

const timestamp = getTimestamp();

describe("canonicalize", () => {

  it("handles empty data", () => {
    const result = canonicalize({}, timestamp);
    expect(result).toEqual({
      activity: null,
      application: null,
      event: null,
      event_value: null,
      extras: {},
      parameters: {},
      run_remote_endpoint: null,
      session: null,
      time: timestamp,
      username: null,
    });
  });

  it("handles missing parameters and extras", () => {
    const body = getValidBody(timestamp, {skipParameters: true, skipExtras: true});
    const result = canonicalize(body, timestamp);
    expect(result).toEqual({
      activity: "activity",
      application: "application",
      event: "event",
      event_value: "event_value",
      run_remote_endpoint: "run_remote_endpoint",
      session: "session",
      time: timestamp,
      username: "username",
      parameters: {},
      extras: {}
    });
  });

  it("handles parameters and extras", () => {
    const result = canonicalize(getValidBody(timestamp), timestamp);
    expect(result).toEqual({
      activity: "activity",
      application: "application",
      event: "event",
      event_value: "event_value",
      run_remote_endpoint: "run_remote_endpoint",
      session: "session",
      time: timestamp,
      username: "username",
      parameters: {
        foo: {
          bar: {
            baz: true
          }
        },
        bam: "boom"
      },
      extras: {
        other: "other",
        some: "some",
        thing: {
          that: {
            is: {
              in: {
                the: {
                  data: true,
                },
              },
            },
          },
        },
      },
    });
  });
});