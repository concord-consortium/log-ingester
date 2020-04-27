const { getContainerInfo } = require("./get-container-info");

describe("getContainerInfo", () => {

  beforeEach(() => {
    process.env.SHOW_CONTAINER_INFO = "true";
  })

  afterEach(() => {
    delete process.env.SHOW_CONTAINER_INFO;
    delete process.env.ECS_CONTAINER_METADATA_FILE;
  })

  it("handles when no SHOW_CONTAINER_INFO environment variable is found", () => {
    delete process.env.SHOW_CONTAINER_INFO;
    const result = getContainerInfo();
    expect(result).toEqual({error: "Disabled: SHOW_CONTAINER_INFO environment variable is not set to 'true'"});
  });

  it("handles when no ECS_CONTAINER_METADATA_FILE environment variable is found", () => {
    const result = getContainerInfo();
    expect(result).toEqual({error: "ECS_CONTAINER_METADATA_FILE environment variable not found!"});
  });

  it("handles when the ECS_CONTAINER_METADATA_FILE environment variable points to a unknown file", () => {
    process.env.ECS_CONTAINER_METADATA_FILE = "./missing-file";
    const result = getContainerInfo();
    expect(result).toEqual({error: "ECS_CONTAINER_METADATA_FILE environment variable file not found (./missing-file)!"});
  });

  it("handles when the ECS_CONTAINER_METADATA_FILE environment variable points to a unknown file", () => {
    process.env.ECS_CONTAINER_METADATA_FILE = "./get-container-info.test.json"
    const result = getContainerInfo();
    expect(result).toEqual({foo: "bar"});
  });

});