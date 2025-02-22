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
  res.send({
    status: "success",
    message: "the server is running successfully.",
  });
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    // API to add a new user
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

    app.get("/tasks/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const tasks = await tasksCollection.find({ email: email }).toArray();
        res.send(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Socket.IO connection handler
    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("addTask", async (taskData) => {
        const email = taskData.email;
        const result = await tasksCollection.insertOne(taskData);

        if (result.acknowledged) {
          const updatedTasks = await tasksCollection
            .find({ email: email })
            .toArray();
          io.emit("tasksUpdated", updatedTasks);
        }
      });
      socket.on("editTask", async (taskData) => {
        try {
          const result = await tasksCollection.updateOne(
            { _id: taskData._id },
            {
              $set: {
                title: taskData.title,
                description: taskData.description,
              },
            }
          );

          if (result.acknowledged) {
            const updatedTasks = await tasksCollection
              .find({ email: taskData.email })
              .toArray();
            io.emit("tasksUpdated", updatedTasks);
          }
        } catch (error) {
          console.error("Error updating task:", error);
        }
      });

      socket.on("updateTask", async (updatedTask) => {
        try {
          const result = await tasksCollection.updateOne(
            { _id: updatedTask._id },
            { $set: { status: updatedTask.status } }
          );

          if (result.acknowledged) {
            const updatedTasks = await tasksCollection
              .find({ email: updatedTask.email })
              .toArray();
            io.emit("tasksUpdated", updatedTasks);
          }
        } catch (error) {
          console.error("Error updating task:", error);
        }
      });

      socket.on("deleteTask", async (_id) => {
        try {
          const id = _id;
          const query = { _id: id };
          const task = await tasksCollection.findOne(query);

          const result = await tasksCollection.deleteOne(query);

          if (result.deletedCount > 0) {
            const updatedTasks = await tasksCollection
              .find({ email: task.email })
              .toArray();
            io.emit("tasksUpdated", updatedTasks);
          }
        } catch (error) {
          console.error("Error updating task:", error);
        }
      });

      // Handle client disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch((err) => {
  console.error("MongoDB connection error:", err);
});

server.listen(port, () => {
  console.log("the server is running on port", port);
});
