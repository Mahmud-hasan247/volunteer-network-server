const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config()

const app = express();
app.use(bodyParser.json());
app.use(cors());

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.yetxo.mongodb.net:27017,cluster0-shard-00-01.yetxo.mongodb.net:27017,cluster0-shard-00-02.yetxo.mongodb.net:27017/${process.env.DB_NAME}?ssl=true&replicaSet=atlas-8altey-shard-0&authSource=admin&retryWrites=true&w=majority`;

const serviceAccount = require("./configs/volunteer-network-a05f8-firebase-adminsdk-gn26t-a9ea35aef0.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DB_URL
});

const port = 4000;

MongoClient.connect(uri, { useUnifiedTopology: true }, function (err, client) {
    const services = client.db(process.env.DB_NAME).collection("services");
    const volunteers = client.db(process.env.DB_NAME).collection("volunteers");

    app.post('/addEvent', (req, res) => {
        const item = req.body;
        services.insertOne(item)
            .then(result => {
                console.log(result);
                res.send(result.insertedCount > 0)
            })
    })

    app.post('/newRegister', (req, res) => {
        const item = req.body;
        volunteers.insertOne(item)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.get('/getEvents', (req, res) => {
        services.find()
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.get('/register/:name', (req, res) => {
        const name = req.params.name;
        services.find({ name: name })
            .toArray((err, documents) => {
                res.send(documents[0])
            })
    })

    app.get('/myEvents/:email', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    const tokenEmail = decodedToken.email;
                    const paramEmail = req.params.email;
                    if (tokenEmail === paramEmail) {
                        volunteers.find({ email: paramEmail })
                            .toArray((err, documents) => {
                                res.send(documents)
                            })
                    }
                    else {
                        res.status(401).send('Unauthorized access...!')
                    }
                })
                .catch(function (error) {
                    console.log(error)
                });
        }
        else {
            res.status(401).send('Unauthorized access...!')
        }
    })

    app.get('/volunteers', (req, res) => {
        volunteers.find()
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.delete('/cancel/:id', (req, res) => {
        const id = req.params.id;
        volunteers.deleteOne({ _id: ObjectId(id) })
            .then(result => {
                res.send(result.deletedCount > 0)
            })
    })

});

app.get('/', (req, res) => {
    res.send('Welcome to volunteer network!')
})

app.listen(process.env.PORT || port);