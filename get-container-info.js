const fs = require("fs");

const getContainerInfo = () => {
  const errorMessage = (message) => {
    return {error: message}
  };

  if (process.env.SHOW_CONTAINER_INFO !== "true") {
    return errorMessage("Disabled: SHOW_CONTAINER_INFO environment variable is not set to 'true'")
  }

  if (!process.env.ECS_CONTAINER_METADATA_FILE) {
    return errorMessage("ECS_CONTAINER_METADATA_FILE environment variable not found!");
  }

  const filename = process.env.ECS_CONTAINER_METADATA_FILE;
  if (!fs.existsSync(filename)) {
    return errorMessage(`ECS_CONTAINER_METADATA_FILE environment variable file not found (${filename})!`);
  }

  try {
    return JSON.parse(fs.readFileSync(filename).toString());
  } catch (e) {
    return errorMessage(`Unable to parse JSON in ${filename}`)
  }
};

module.exports = {
  getContainerInfo
}