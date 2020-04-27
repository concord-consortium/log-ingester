
const getTestPool = () => {
  let nextId = 1;
  const testClient = {
    query: jest.fn(() => new Promise(resolve => resolve({
      rows: [{id: nextId++}]
    }))),
    release: jest.fn()
  }
  return {
    connect: jest.fn(() => new Promise(resolve => resolve(testClient))),
    end: jest.fn()
  }
}

const getValidBody = (timestamp, options) => {
  options = options || {};
  const {skipParameters, skipExtras} = options;

  const body = {
    activity: "activity",
    application: "application",
    event: "event",
    event_value: "event_value",
    run_remote_endpoint: "run_remote_endpoint",
    session: "session",
    time: timestamp,
    username: "username",
  };

  if (!skipParameters) {
    body.parameters = {
      foo: {
        bar: {
          baz: true
        }
      },
      bam: "boom"
    }
  }

  if (!skipExtras) {
    body.some = "some",
    body.other = "other",
    body.thing = {that: {is: {in: {the: {data: true}}}}}
  }

  return body;
};

module.exports = {
  getTestPool,
  getValidBody,
};
