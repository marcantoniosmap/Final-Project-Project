const router = require('express').Router();
const verify = require('./verifyToken');
const Project = require('../model/Project');
const fetch = require('node-fetch');


const domainForAuthApi='http://CogetherAuth-env.eba-3vhu2w8q.ap-southeast-1.elasticbeanstalk.com'
// const domainForAuthApi='http://localhost:8000'

const DELETEUSERPROJECTURL=domainForAuthApi+'/api/userProject/delete/';
const CREATEUSERPROJECTURL=domainForAuthApi+'/api/userProject/create';
const FINDUSERPROJECT =domainForAuthApi+'/api/userProject/findOne';
const GETCOLLABORATOR =domainForAuthApi+ '/api/userProject/getCollaborator/';
const GETUSERID=domainForAuthApi+'/api/user/';


function getIdCopy(projectType){
  if (projectType==="vanilla"){
    return '5ee48e02bf59374e615e2b28'
  }
  else if (projectType==="react"){
    return '5ee3ce9680fcd7c12134cbc6'
  }
  return ''
}
function parseDate(dateObj){
  const date = dateObj.getUTCDate();
  const month = dateObj.getUTCMonth()+1;
  const year = dateObj.getUTCFullYear();
  return date+'/'+month+'/'+year;
}
function modified(project){
  return {
    _id:project._id,
    owner_id:project.owner_id,
    title:project.title,
    description:project.description,
    projectType:project.projectType,
    sharedPassword:project.sharedPassword,
    date_created_text:parseDate(project.date_created),
    last_updated_text:parseDate(project.last_updated)

  }
}

router.get('/detail/:id',verify,async(req,res)=>{
  const project_id= req.params.id;
  const fetchAPI=async(url,token)=>{
    try{
     const getUser = await fetch(url,{
       method:'GET', headers:{
      'auth-token':token}
         });
       const json = await getUser.json();
       return json;
    }catch(err){
      console.log(err);
    }
  }
  try{
     const project= await Project.findOne({_id:project_id});
     const retProject = modified(project);
     const url= GETUSERID+project.owner_id;
    const user = await fetchAPI(url,req.header('auth-token'));
    const collab = await fetchAPI(GETCOLLABORATOR+project_id,req.header('auth-token'));

     res.send({project:retProject,user:user,collaborator:collab});
  }catch(err){
    res.status(400).send({err:err});
  }
});

// router.get('/',verify,async(req,res)=>{
//     const user_id= req.user._id;
//     const userProject= await UserProject.find({user_id: user_id});
//     const retArr=[];
//     for (project of userProject){
//       const tempPro=await Project.findOne({_id:project.project_id});
//       retArr.push({
//         _id: tempPro._id,
//         owner_id:tempPro.owner_id,
//         title:tempPro.title,
//         description:tempPro.description,
//         projectType:tempPro.projectType,
//        })
//     }
//     res.send({projects:retArr});
// })

router.get('/:_id',verify,async(req,res)=>{
  const _id= req.params._id;
 try{
    const project= await Project.findOne({_id:_id});
    res.status(200).send(project);
 }catch(err){
   res.status(400).send({err:err});
 }
});



router.post('/getProjects',verify,async(req,res)=>{
  const idList = req.body.idList;
  if (!idList.length) res.status(200).send([]);
  try{
    const retArr=[]
    for(id of idList){
      const project = await Project.findOne({_id:id});
      retArr.push({
        _id: project._id,
      owner_id:project.owner_id,
      title:project.title,
      description:project.description,
      projectType:project.projectType,
      last_updated:project.last_updated,
      last_updated_text:parseDate(project.last_updated)
      })
    }
    retArr.sort(function(a,b){
      const dateA =a.last_updated, dateB = b.last_updated;
      return dateB-dateA; 
    })
    res.status(200).send(retArr);
  }catch(err){
    res.status(400).send({err:err});
  }
})

router.delete('/delete/:id',verify,async(req,res)=>{
  try{
    const project = await Project.findOne({_id:req.params.id});
    if (req.user._id ===project.owner_id){
      
      const deleteProject = await Project.deleteOne({_id:req.params.id});
      const deleteUserProject = await fetch(DELETEUSERPROJECTURL+req.params.id,
                                  {method:'DELETE', headers:{
                                    'auth-token':req.header('auth-token')
                                  }});
            
      res.send({status:'ok'});
    }
  }catch(err){
    res.send({status:err});
  }
});

router.get('/check/:id',verify,async(req,res)=>{
  const user = await UserProject.find({project_owned:req.params.id});
  res.send(user);
})

router.post('/create',verify,async(req,res) => {
    const projectType=req.body.projectType
    const idForCopy=getIdCopy(projectType);
    const sourceCopy = await Project.findOne({_id:idForCopy});
    console.log(sourceCopy);
    const sourceArr=sourceCopy.source;
    const project = new Project({
        owner_id: req.user._id,
        title: req.body.title,
        description:req.body.description,
        projectType : req.body.projectType,
        source : sourceArr
    })
    try {
      const savedProject = await project.save();
      const userProjectBody =JSON.stringify({
        user_id:req.user._id,
        project_id: project._id,
        ownership_type:"owner"
      });
      const get_data = async url =>{
        try{
          const userProject = await fetch(url,
            {method:'POST', headers:{
              "Content-Type":'application/json',
              "auth-token":req.header('auth-token')
            }, body:userProjectBody});
            const json = await userProject.json();
            return json;
          } catch (err){
            console.log(err);
          }
      }
      const json = await get_data(CREATEUSERPROJECTURL);
      res.send({status:200,project:savedProject,userpro:json});

    }catch(err){
        res.send({status:err});
    }
});

router.post('/createObject',verify, async(req,res)=>{
  const project_new={
    filename:`/${req.body.fileName}`,
    type:req.body.fileType,
    code :"",
  };
  await Project.findOneAndUpdate(
    {_id:req.body._id},
    {$push : {source:project_new}},
    function(error,success){
      if (error){
        res.status(401).send({err:error});
      }else{
        res.status(200).send({status:success});
      }
    }
  );

});

router.post('/deleteObject',verify, async(req,res)=>{
  const project_delete={
    filename:req.body.fileName,
  };
  await Project.findOneAndUpdate(
    {_id:req.body._id},
    {$pull : {source:project_delete}},
    function(error,success){
      if (error){
        res.status(401).send({err:error});
      }else{
        res.status(200).send({status:success});
      }
    }
  );

});




router.get('/read/:_id',verify,async(req,res)=>{
    const projectId= req.params._id;
    const userRequest = req.user._id;
    const userCheckBody=JSON.stringify({
        project_id:projectId,
        user_id:userRequest
    });
    try{
      const userCheck = await fetch(FINDUSERPROJECT,
                                    {method:'POST',
                                    header:{
                                      'content-type':'application/json',
                                      'auth-token':req.header('auth-token')
                                    },body:{cred:userCheckBody}})
      const project = await Project.findOne({_id:projectId});
      if (req.user._id===project.owner_id || userCheck){
        res.status(200).send({projectType:project.projectType,source:project.source});
      }
      else{
        res.status(401).send({err:'Unauthorized'});
      }
    }catch(err){
      res.status(400).send({err:"error to fetch Data"});
    }
});


router.put('/updateProject',verify,async(req,res)=>{
  const project = await Project.findOne({_id:req.body._id});
  if (req.user._id===project.owner_id){
    const updateProject= await Project.updateOne(
      {_id:req.body._id},
      {$set:{title:req.body.title,description:req.body.description,last_updated:Date.now()}
    });
    res.send({status:"OK"});
  }else{
    req.status(400).send({err:'error to change data'});
  }
});



module.exports = router;
