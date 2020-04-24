// returns number of seconds since epoch (not milliseconds)
const getTimestamp = () => Math.round(Date.now() / 1000);

module.exports = {
  getTimestamp
};