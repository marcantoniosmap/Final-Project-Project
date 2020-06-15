const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

module.exports = async function (req,res,next){
    
    const token = req.header('auth-token');
    if(!token) return res.status(401).send('Access Denied');
    try{
        const response = await fetch(`CogetherAuth-env.eba-3vhu2w8q.ap-southeast-1.elasticbeanstalk.com/api/user/checkToken/${token}`);
        const data = await response.json(); 
        req.user= data;
        next();

    }catch(err){
        res.status(403).send('Invalid Token');
    }
}