const express = require('express');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express();

// -----------middleware-----
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8jqou.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // ----------------collection------------------
        const menuCollection = client.db("Boss-DB").collection('boss-menu')
        const reviewCollection = client.db("Boss-DB").collection('boss-reviews')
        const cartCollection = client.db("Boss-DB").collection('boss-carts')



        // ----------------------------------------------------------------------------------------
        //------menu---------
        // ----------------------------------------------------------------------------------------


        // ---------------get all menu----------------
        app.get("/menus", async (req, res) => {

            const result = await menuCollection.find().toArray();

            res.send(result)
        })



        // ----------------------------------------------------------------------------------------
        //------reviews---------
        // ----------------------------------------------------------------------------------------

        // -----------get all reviews---------------------------------
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })




        // ----------------------------------------------------------------------------------------
        //------CARTS---------
        // ----------------------------------------------------------------------------------------

        // -----------get all Cart items---------------------------------
        app.get("/carts", async (req, res) => {
            const email = req.query.email
            // console.log(email)
            const query = { addedBy: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        // ----------------------get cart item by id -----------------------------
        app.get("/carts/:id", async (req, res) => {
            const id = req.params.id
            // console.log(email)
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        //----------add to cart--------
        app.post('/carts', async (req, res) => {
            const cartItem = req.body
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })

           // ----------------------delete cart item by id -----------------------------
           app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id
            // console.log(email)
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result)
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
    res.send('Boos is eating!')
})



app.listen(port)