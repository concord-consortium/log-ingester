const { getTimestamp } = require("./timestamp");

describe("timestamp", () => {

  it("returns the number of seconds, not milliseconds", () => {
    const savedNow = Date.now;
    const now = savedNow();
    Date.now = () => now;

    const timestamp = getTimestamp();
    expect(timestamp).toEqual(Math.round(now / 1000));

    Date.now = savedNow;
  });

});