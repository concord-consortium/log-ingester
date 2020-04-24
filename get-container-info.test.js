const { getContainerInfo } = require("./get-container-info");

describe("getContainerInfo", () => {

  it("handles when no environment variable is found", () => {
    const result = getContainerInfo();
    expect(result).toEqual({error: "ECS_CONTAINER_METADATA_FILE environment variable not found!"});
  });

  it("handles when the environment variable points to a unknown file", () => {
    process.env.ECS_CONTAINER_METADATA_FILE = "./missing-file"
    const result = getContainerInfo();
    expect(result).toEqual({error: "ECS_CONTAINER_METADATA_FILE environment variable file not found (./missing-file)!"});
    delete process.env.ECS_CONTAINER_METADATA_FILE;
  });

  it("handles when the environment variable points to a unknown file", () => {
    process.env.ECS_CONTAINER_METADATA_FILE = "./get-container-info.test.json"
    const result = getContainerInfo();
    expect(result).toEqual({foo: "bar"});
    delete process.env.ECS_CONTAINER_METADATA_FILE;
  });

});