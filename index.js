const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express();

// -----------middleware-----
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8jqou.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // ----------------collection------------------
        const menuCollection = client.db("Boss-DB").collection('boss-menu')
        const reviewCollection = client.db("Boss-DB").collection('boss-reviews')
        const cartCollection = client.db("Boss-DB").collection('boss-carts')
        const UserCollection = client.db("Boss-DB").collection('boss-users')


        // ---auth related Apis-------------------------------
        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body;

                // Validate user data
                if (!user || !user.email) {
                    return res.status(400).send({ success: false, message: "Invalid user data" });
                }

                // Create the JWT token
                const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });

                // Set the JWT token as an HTTP-only cookie
                res
                    .cookie('token', token, {
                        httpOnly: true, // Cookie not accessible via JavaScript
                        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
                        sameSite: process.env.NODE_ENV === 'production' ? "none" : "strict", // Cross-site in production, strict otherwise
                    })
                    .send({ success: true });
            } catch (error) {
                console.error("JWT Error:", error.message);
                res.status(500).send({ success: false, message: "Internal server error" });
            }
        });

        // --------------removing token on log out------
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? "none" : "strict"
            }).send({ tokenRemoved: true })
        })

        // _______________token verify------------
        const tokenVerify = (req, res, next) => {
            // Retrieve token from cookies or Authorization header
            const token = req?.cookies?.token || req.headers.authorization?.split(" ")[1];

            // console.log("Inside the tokenVerify middleware:", token);

            // If no token is found, return 401 Unauthorized
            if (!token) {
                return res.status(401).send({ message: "Unauthorized access" });
            }

            // Verify the token
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    // console.error("JWT Verification Error:", err.message);
                    return res.status(403).send({ message: "Forbidden: Invalid or Expired Token" });
                }

                // Attach decoded data to the request object
                req.decoded = decoded;

                // Proceed to the next middleware or route handler
                next();
            });
        };

        //____________________admin verify---------
        const adminVerify = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await UserCollection.findOne(query);
            const isAdmin = user?.role == 'admin';

            if (!isAdmin) {
                return res.status(403).send({ massage: 'unauthorized access' })
            }
            next()
        }


        // ----------------------------------------------------------------------------------------
        //------menu---------
        // ----------------------------------------------------------------------------------------

        // ---------------get all menu----------------
        app.get("/menus", async (req, res) => {

            const result = await menuCollection.find().toArray();

            res.send(result)
        })

        //----------add Menu  (admin only)--------
        app.post('/menus', tokenVerify, adminVerify, async (req, res) => {
            const menuItem = req.body
            const result = await menuCollection.insertOne(menuItem)
            res.send(result)
        })

        // ----------------------------------------------------------------------------------------
        //------Users---------
        // ----------------------------------------------------------------------------------------

        // -----------get all user---------------------------------
        app.get("/users", tokenVerify, adminVerify, async (req, res) => {
            const result = await UserCollection.find().toArray();
            res.send(result)
        })

        //----------add users--------
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const exist = await UserCollection.findOne(query)

            if (exist) {
                return res.send({ massage: 'User Already exist', insertedId: null })
            }

            const result = await UserCollection.insertOne(user)
            res.send(result)
        })

        // ----------------------get user by id -----------------------------
        app.get("/users/:id", tokenVerify, adminVerify, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await UserCollection.find(query).toArray();
            res.send(result)
        })


        // ----------------------patch user by id to make admin -----------------------------
        app.patch("/users/:id", tokenVerify, adminVerify, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }

            const result = await UserCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        // ----------------------delete user by id -----------------------------
        app.delete("/users/:id", tokenVerify, adminVerify, async (req, res) => {
            const id = req.params.id
            // console.log(email)
            const query = { _id: new ObjectId(id) }
            const result = await UserCollection.deleteOne(query);
            res.send(result)
        })

        // -----------check the user is admin or not----------------------
        app.get('/users/admin/:email', tokenVerify, async (req, res) => {

            const email = req.params.email;

            // console.log('email', req.decoded.email)
            if (email !== req?.decoded?.email) {
                return res.status(403).send({ massage: 'unauthorized access' })
            }
            else {
                const query = { email: email }
                const user = await UserCollection.findOne(query);
                let admin = false;

                if (user) {
                    admin = user?.role == "admin"
                }
                res.send({ admin })
            }
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

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Boos is eating!')
})

app.listen(port)