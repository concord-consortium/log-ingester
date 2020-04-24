# log-ingester

Simple node-based log ingester


## Postgres Setup

### Create Database

```
CREATE DATABASE json_log_manager;
```

### Create Table

```
CREATE TABLE json_logs (
  id integer,
  session varchar(255),
  username varchar(255),
  application varchar(255),
  activity varchar(255),
  event varchar(255),
  time timestamp,
  parameters jsonb,
  extras jsonb,
  event_value varchar(255),
  run_remote_endpoint varchar(255)
);
```

### Create Sequence

```
CREATE SEQUENCE next_json_logs_id START 1;
```

### Create Indices

```
CREATE INDEX index_json_logs_on_activity ON json_logs USING btree (activity);
CREATE INDEX index_json_logs_on_application ON json_logs USING btree (application);
CREATE INDEX index_json_logs_on_event ON json_logs USING btree (event);
CREATE INDEX index_json_logs_on_run_remote_endpoint ON json_logs USING btree (run_remote_endpoint) WHERE run_remote_endpoint IS NOT NULL;
CREATE INDEX index_json_logs_on_session ON json_logs USING btree (session);
CREATE INDEX index_json_logs_on_time ON json_logs USING btree (time);
CREATE INDEX index_json_logs_on_username ON json_logs USING btree (username);
```
