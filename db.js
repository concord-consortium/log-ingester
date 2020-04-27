const { Pool } = require('pg');

class DB {
  constructor (options) {
    this.options = options || {};
  }

  disconnect() {
    if (this.pool) {
      this.pool.end();
    }
  }

  async insert(entry) {
    const {session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint} = entry;

    const client = await this._getClient();
    const result = await client.query("INSERT INTO json_logs (id, session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint) VALUES (nextval('next_json_logs_id'), $1, $2, $3, $4, $5, to_timestamp($6), $7, $8, $9, $10) RETURNING id",
      [session, username, application, activity, event, time, parameters, extras, event_value, run_remote_endpoint]
    );
    client.release();

    return {id: result.rows[0].id, _client: client};  // client is returned for testing it called release
  }

  async _getClient() {
    this.pool = this.pool || this.options.pool;
    if (!this.pool) {
      const connectionString = process.env.RDS_DATABASE_URL;
      if (!connectionString) {
        throw new Error("Missing RDS_DATABASE_URL environment variable");
      }
      this.pool = new Pool({connectionString, statement_timeout: 1000*10});
    }
    return await this.pool.connect();
  }
}

module.exports = {
  DB
};
