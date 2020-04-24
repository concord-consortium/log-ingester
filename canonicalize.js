const canonicalize = (rawData, timestamp) => {
  const data = {};
  ['session', 'username', 'application', 'activity', 'event', 'event_value', 'run_remote_endpoint'].forEach((col) => {
    data[col] = rawData.hasOwnProperty(col) ? String(rawData[col]) : null;
  })
  data.time = timestamp;
  data.parameters = rawData.parameters || {};
  var extras = {};
  Object.keys(rawData).forEach((key) => {
    if (!data.hasOwnProperty(key)) {
      extras[key] = rawData[key]
    }
  });
  data.extras = extras;
  return data;
};

module.exports = {
  canonicalize
};