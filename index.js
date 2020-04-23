
const createServer = require("./server");
const { connectDB, disconnectDB, insertIntoDB } = require("./db");
const port = process.env.PORT || 3000;

createServer({ port, connectDB, disconnectDB, insertIntoDB });
