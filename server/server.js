const mongoose = require("mongoose")
const Document = require("./Document")
const dotenv = require("dotenv");

dotenv.config();

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const io = require("socket.io")(3001, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

console.log("Socket server listening on port 3001");

const defaultValue = ""

io.on("connection", socket => {
  console.log("Client connected");

  socket.on("get-document", async documentId => {
    console.log("Fetching document:", documentId);
    const document = await findOrCreateDocument(documentId)
    socket.join(documentId)
    socket.emit("load-document", document.data)

    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("receive-changes", delta)
    })

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, { data })
    })
  })
})

async function findOrCreateDocument(id) {
  if (id == null) return

  const document = await Document.findById(id)
  if (document) {
    console.log("Document found:", id);
    return document;
  }
  console.log("Creating new document:", id);
  return await Document.create({ _id: id, data: defaultValue })
}
