const mongoose = require('mongoose');
const randToken = require('rand-token');

const postSchema = new mongoose.Schema({
    owner_id :{
        type:String,
        max: 255,
        min:6,
        required: true
    },
    title:{
        type:String,
        required : true,
        max: 255,
        min:6
    },
    description:{
        type:String,
        required : false,
        max: 1024,
        min: 6,
    },
    projectType:{
        type:String,
        required:true,
    },
    date_created:{
        type: Date, 
        default : Date.now
    },
    last_updated:{
        type: Date, 
        default : Date.now
    },
    source: [{
        filename: {
            type: String,
            required: true,
            max: 33,
        },
        type: {
            type: String,
            required: true,
            max: 10,
        },
        code: {
            type: String,
            required: false
        },
    }],
    sharedPassword:{
        type:String,
        default:function(){
            return randToken.generate(24);
        },
        unique:true
    }
});


module.exports = mongoose.model('Project', postSchema);