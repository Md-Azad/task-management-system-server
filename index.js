// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const app = express();
// const cors = require("cors");

// const port = process.env.PORT || 3000;
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

// app.use(cors());
// app.use(express.json());

// app.get("/", (req, res) => {
//   console.log(process.env.DB_USER);
//   res.send({
//     status: "success",
//     message: "the server is running successfully.",
//   });
// });

// const { MongoClient, ServerApiVersion } = require("mongodb");
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn37c5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

//     const userCollection = client
//       .db("TaskManagementSystem")
//       .collection("users");
//     const tasksCollection = client
//       .db("TaskManagementSystem")
//       .collection("tasks");

//     app.post("/users", async (req, res) => {
//       const user = req.body;
//       const email = user.email;
//       const query = { email: email };
//       const isExistUser = await userCollection.findOne(query);
//       if (isExistUser) {
//         return res.send({ message: "user already exist", insertedId: null });
//       }
//       const result = await userCollection.insertOne(user);
//       res.send(result);
//     });

//     io.on("connection", (socket) => {
//       console.log("Client connected:", socket.id);

//       // Listen for "addTask" event from client
//       socket.on("addTask", async (taskData) => {
//         const result = await tasksCollection.insertOne(taskData);

//         if (result.acknowledged) {
//           // Fetch updated tasks from DB
//           const updatedTasks = await tasksCollection.find().toArray();

//           // Emit updated task list to all clients
//           io.emit("tasksUpdated", updatedTasks);
//         }
//       });

//       socket.on("disconnect", () => {
//         console.log("Client disconnected:", socket.id);
//       });
//     });
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!"
//     );
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

// app.listen(port, () => {
//   console.log("the server is running on port", port);
// });

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const cors = require("cors");

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/", (req, res) => {
  console.log(process.env.DB_USER);
  res.send({
    status: "success",
    message: "the server is running successfully.",
  });
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn37c5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client
      .db("TaskManagementSystem")
      .collection("users");
    const tasksCollection = client
      .db("TaskManagementSystem")
      .collection("tasks");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      const query = { email: email };
      const isExistUser = await userCollection.findOne(query);
      if (isExistUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/tasks", async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("addTask", async (taskData) => {
        const result = await tasksCollection.insertOne(taskData);

        if (result.acknowledged) {
          const updatedTasks = await tasksCollection.find().toArray();
          io.emit("tasksUpdated", updatedTasks);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch((err) => {
  console.error("MongoDB connection error:", err);
});

server.listen(port, () => {
  console.log("the server is running on port", port);
});
