const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://serene-stays-727c7.web.app",
      "https://serene-stays-727c7.firebaseapp.com",
      "https://serene-stays-001.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8gru8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middlewares

const logger = async (req, res, next) => {
  console.log("Called:", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "not Authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorizeds" });
    }

    //if token is valid then it would be decoded
    console.log("value in the token ", decoded);
    req.user = decoded;
    next();
  });
};

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();

    const roomsCollection = client.db("sereneStaysDB").collection("rooms");
    const bookingCollection = client.db("sereneStaysDB").collection("bookings");
    const usersCollection = client.db("sereneStaysDB").collection("users");

    //Auth related Api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    //services related Api------
    app.get("/allrooms", logger, async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });

    app.get("/allrooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    app.patch("/allrooms/:id", async (req, res) => {
      const id = req.params.id;
      const bookedDate = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateReview = {
        $set: {
          Availability: bookedDate,
        },
      };
      const result = await roomsCollection.updateOne(filter, updateReview);
      res.send(result);
    });

    app.patch("/allrooms/:id", async (req, res) => {
      const roomId = req.params.id;
      const query = { _id: new ObjectId(roomId) };
      const update = { $unset: { availability: "" } };

      const result = await roomsCollection.updateOne(query, update);
      res.send(result);
    });

    // Users API
    app.post("/users", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query.email = req.query.email;
      }
      const result = await usersCollection.find(query).toArray();
      // Filter to only include name, email, and photoUrl
      const filteredResult = result.map((user) => ({
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
      }));
      res.send(filteredResult);
    });

    // Bookings API
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      // console.log("tok tok", req.cookies.token);
      console.log(req.query.email);
      console.log("used in the valid token", req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden Asscess" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking._id);
      if (booking._id && typeof booking._id === "string") {
        booking._id = new ObjectId();
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDate = {
        $set: {
          bookedDate: query,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDate);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Serene Stays Server running");
});

app.listen(port, () => {
  console.log(`Serene Stays Server running on port ${port}`);
});

60 - 7;
