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

  async getInfo() {
    const {totalCount, idleCount, waitingCount} = this._getPool();
    const client = await this._getClient();
    const result = await client.query("SELECT MAX(id) as max_id FROM json_logs");
    client.release();

    return {logsTable: { maxId: result.rows[0].max_id}, pool: { totalCount, idleCount, waitingCount }, _client: client};  // client is returned for testing it called release
  }

  async _getClient() {
    return await this._getPool().connect();
  }

  _getPool() {
    this.pool = this.pool || this.options.pool;
    if (!this.pool) {
      const connectionString = process.env.RDS_DATABASE_URL;
      if (!connectionString) {
        throw new Error("Missing RDS_DATABASE_URL environment variable");
      }
      this.pool = new Pool({connectionString, statement_timeout: 1000*10});
    }
    return this.pool;
  }
}

module.exports = {
  DB
};
