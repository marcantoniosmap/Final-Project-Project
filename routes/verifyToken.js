const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

module.exports = async function (req,res,next){
    
    const token = req.header('auth-token');
    // console.log(token);
    if(!token) return res.status(401).send('Access Denied');
    try{
        const getUser = async (token)=>{
            try{
                const response = await fetch(`CogetherAuth-env.eba-3vhu2w8q.ap-southeast-1.elasticbeanstalk.com/api/user/checkToken/${token}`,
                                                {method:'GET'});
                const data = await response.json();
                return data;
            }catch(err){
                return err;
            }

        }
        const data = await getUser(token); 
        req.user= data;
        next();

    }catch(err){
        res.status(403).send('Invalid Token');
    }
}