// const { Client } = require('pg');

const fakeClient = {
  _nextId: 1,
  query: () => new Promise(resolve => resolve({
    rows: [{id: fakeClient._nextId++}]
  })),
  end: () => undefined
};

const connectDB = async (options) => {
  options = options || {};
  if (options.fakeClient) {
    return new Promise((resolve) => resolve(options.fakeClient))
  }
  if (options.fake) {
    return new Promise((resolve) => resolve(fakeClient))
  }

  const connectionString = process.env.RDS_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing RDS_DATABASE_URL environment variable");
  }

  client = new Client({connectionString, statement_timeout: 1000*10});
  await client.connect();

  return client;
}

const disconnectDB = async (client) => {
  if (client) {
    await client.end();
  }
}

const insertIntoDB = async (client, entry, body) => {
  const {session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint} = entry;

  const result = await client.query("INSERT INTO logs (session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint) VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8, $9, $10) RETURNING id",
    [session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint]
  );

  return {id: result.rows[0].id};
}

module.exports = {
  connectDB,
  disconnectDB,
  insertIntoDB
};
