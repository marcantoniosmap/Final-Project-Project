const express = require('express');
const app = express();
const router = require('express').Router();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors= require('cors');

//import routes
const projectRoute = require('./routes/project');


dotenv.config();


//Connect to DB
mongoose.connect(process.env.DB_CONNECTION,{ useNewUrlParser: true,useUnifiedTopology: true,useFindAndModify: false },()=>{
    console.log("connected to db");
});

//middlewares
app.use(express.json());
app.use(cors());


//ROUTES
app.get('/',(req,res)=>{
    res.send('we are here');
});

app.use('/api/project', projectRoute);

app.listen(9000);