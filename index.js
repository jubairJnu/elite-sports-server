const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000; 
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

app.use(cors())
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d8yzbln.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    
    if (err) {
      console.log(err);
      return res.status(401).send({ error: true, message: 'unauthrized access' })
    }

    req.decoded = decoded;
    next();
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const popularClassCollection = client.db("sportsDB").collection("popular");
    const usersCollection = client.db("sportsDB").collection("users");
    const popularInstCollection = client.db("sportsDB").collection("popularInst");
    const classesCollection = client.db("sportsDB").collection("classes");
    const cartsCollection = client.db("sportsDB").collection("carts");
    const paymentsCollection = client.db("sportsDB").collection("payments");


    // jwt token
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({token});
    })

    // instructor
    app.get('/instructor/myclass',  async (req, res) => {
      const email = req.query.email;
      // console.log(email);
           if (!email) {
        res.send([]);
       
      }
    
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });


    // user related api
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    // get user by role---
    app.get('/user/instructor', async(req,res)=>{
      const query = {role: 'instructor'};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'already exisit' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // -----------

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });




    // popoular section
    app.get('/popular', async (req, res) => {
      const result = await popularClassCollection.find().toArray();
      res.send(result);
    })

    app.get('/popularinst', async (req, res) => {
      const result = await popularInstCollection.find().toArray();
      res.send(result);
    })


    // ***-** class related api*****

    app.get('/classPending', async (req, res) => {
      const query = { Status: "pending" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })


    // ---classs approved
    app.get('/classApproved', async (req, res) => {
      const query = { Status: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })

    app.patch('/classApprove/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Status: 'approved'
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    app.post('/class', async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    })

    //**--carts related api---- */ 
    app.get('/myCarts',  async (req, res) => {
      const email = req.query.email;
      // console.log(email);
           if (!email) {
        res.send([]);
       
      }
    
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const newCart = req.body;
      const result = await cartsCollection.insertOne(newCart);
      res.send(result);
    })

    // cart payment api

    app.post('/create-payment-intent',  async (req, res) => {
      const { price } = req.body;
    
     if(price){
      const amount = parseFloat(price) * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
     }

     
    });

    app.post('/payment', async(req,res)=>{
      const newPayment = req.body;
      const result = await paymentsCollection.insertOne(newPayment);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('server is runnig')
});

app.listen(port, () => {
  console.log(`server is runnig on ${port}`);
})