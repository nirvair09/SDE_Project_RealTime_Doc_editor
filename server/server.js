const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const Document = require("./Document");
const dotenv = require("dotenv");
const socketio = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const defaultValue = "";

// Express middleware for JSON parsing
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// Socket.io connection
io.on("connection", (socket) => {
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// Express route for handling API requests
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// Helper function to find or create a document
async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
