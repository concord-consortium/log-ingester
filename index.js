
const { createServer } = require("./server");

const port = process.env.PORT || 3000;

let pool;
if (process.argv[2] === "fake") {
  let nextId = 1;
  const client = {
    query: () => new Promise(resolve => resolve({
      rows: [{id: nextId++}]
    })),
    release: () => undefined
  };
  pool = {
    connect: new Promise(resolve => resolve(client)),
    end: () => undefined
  }
}

const startServer = async () => {
  try {
    await createServer({ port, pool, exit: true, log: true });
    console.log(`Server is listening on port ${port}`);
  } catch (e) {
    console.error(e.toString());
  }
}

startServer();


