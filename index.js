
const { createServer } = require("./server");
const { connectDB, disconnectDB, insertIntoDB } = require("./db");

const port = process.env.PORT || 3000;

let fakeClient;
if (process.argv[2] === "fake") {
  let nextId = 1;
  fakeClient = {
    query: () => new Promise(resolve => resolve({
      rows: [{id: nextId++}]
    })),
    end: () => undefined
  };
}

const startServer = async () => {
  try {
    await createServer({ port, connectDB, disconnectDB, insertIntoDB, fakeClient, exit: true, log: true });
    console.log(`Server is listening on port ${port}`);
  } catch (e) {
    console.error(e.toString());
  }
}

startServer();


