const router = require('express').Router();
const verify = require('./verifyToken');
const Project = require('../model/Project');
const fetch = require('node-fetch');


const domainForAuthApi='https://auth.cogether.me'
// const domainForAuthApi='http://localhost:8000'

const DELETEUSERPROJECTURL=domainForAuthApi+'/api/userProject/delete/';
const CREATEUSERPROJECTURL=domainForAuthApi+'/api/userProject/create';
const FINDUSERPROJECT =domainForAuthApi+'/api/userProject/findOne';
const GETCOLLABORATOR =domainForAuthApi+ '/api/userProject/getCollaborator/';
const GETUSERID=domainForAuthApi+'/api/user/';
const DELETECOLLABORATOR = domainForAuthApi+'/api/userProject/deleteCollaborator'


function getIdCopy(projectType){
  if (projectType==="vanilla"){
    return '5ee48e02bf59374e615e2b28'
  }
  else if (projectType==="react"){
    // return '5ee3ce9680fcd7c12134cbc6'
    return '5eea6549e64c81186ac139b4'
  }else if (projectType==="vue"){
    return '5eea6796e181c11881b064ed'
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
      conso .log(err);
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
    const sourceArr=sourceCopy.source;
    const project = new Project({
        owner_id: req.user._id,
        title: req.body.title,
        description:req.body.description,
        projectType : req.body.projectType,
        source : sourceArr
    });
    try {
      const savedProject = await project.save();
      const userProjectBody =JSON.stringify({
        user_id:req.user._id,
        project_id: project._id,
        ownership_type:"owner"
      });
      const get_data = async (url,token,userProjectbody) =>{
        try{
          const userProject = await fetch(url,
            {method:'POST', headers:{
              "Content-Type":'application/json',
              "auth-token":token
            }, body:userProjectbody});
            const json = await userProject.json();
            return json;
          } catch (err){
            console.log(err);
          }
      }
      const json = await get_data(CREATEUSERPROJECTURL,req.header('auth-token'),userProjectBody);
      res.send({status:200,project:savedProject,userpro:json});

    }catch(err){
        res.send({status:err});
    }
});

router.post('/createCustom',async(req,res) => {
  const title = 'VUE TEMPLATE';
  const owner_id = 'owner';
  const description='this is vue template';
  const projectType ='vue';
  const source =[{
    filename:"/package.json",
    type:"file",
    code :`{
      "name": "vue",
      "version": "0.1.0",
      "private": true,
      "scripts": {
        "serve": "vue-cli-service serve",
        "build": "vue-cli-service build",
        "lint": "vue-cli-service lint"
      },
      "dependencies": {
        "@vue/cli-plugin-babel": "4.1.1",
        "vue": "^2.6.11"
      },
      "devDependencies": {
        "@vue/cli-plugin-eslint": "4.1.1",
        "@vue/cli-service": "4.1.1",
        "babel-eslint": "^10.0.3",
        "eslint": "^6.7.2",
        "eslint-plugin-vue": "^6.0.1",
        "vue-template-compiler": "^2.6.11"
      },
      "eslintConfig": {
        "root": true,
        "env": {
          "node": true
        },
        "extends": [
          "plugin:vue/essential",
          "eslint:recommended"
        ],
        "rules": {},
        "parserOptions": {
          "parser": "babel-eslint"
        }
      },
      "postcss": {
        "plugins": {
          "autoprefixer": {}
        }
      },
      "browserslist": [
        "> 1%",
        "last 2 versions",
        "not ie <= 8"
      ],
      "keywords": [
        "vue",
        "vuejs",
        "starter"
      ],
      "description": "Vue.js example starter project"
    }`
  },{
  filename:"/public/index.html",
  type:"file",
  code :`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <link rel="icon" href="<%= BASE_URL %>favicon.ico">
      <title>codesandbox</title>
    </head>
    <body>
      <noscript>
        <strong>We're sorry but cogether doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
      </noscript>
      <div id="app"></div>
      <!-- built files will be auto injected -->
    </body>
  </html>
  
  `
},{
  filename:"src/components/HelloWorld.vue",
  type:"file",
  code :`<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <h3>Installed CLI Plugins</h3>
    <ul>
      <li>
        <a
          href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-babel"
          target="_blank"
          rel="noopener"
        >babel</a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint"
          target="_blank"
          rel="noopener"
        >eslint</a>
      </li>
    </ul>
    <h3>Essential Links</h3>
    <ul>
      <li>
        <a href="https://vuejs.org" target="_blank" rel="noopener">Core Docs</a>
      </li>
      <li>
        <a href="https://forum.vuejs.org" target="_blank" rel="noopener">Forum</a>
      </li>
      <li>
        <a href="https://chat.vuejs.org" target="_blank" rel="noopener">Community Chat</a>
      </li>
      <li>
        <a href="https://twitter.com/vuejs" target="_blank" rel="noopener">Twitter</a>
      </li>
      <li>
        <a href="https://news.vuejs.org" target="_blank" rel="noopener">News</a>
      </li>
    </ul>
    <h3>Ecosystem</h3>
    <ul>
      <li>
        <a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a>
      </li>
      <li>
        <a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/vue-devtools#vue-devtools"
          target="_blank"
          rel="noopener"
        >vue-devtools</a>
      </li>
      <li>
        <a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a>
      </li>
      <li>
        <a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "HelloWorld",
  props: {
    msg: String
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

  `
},{
  filename:"src/app.vue",
  type:"file",
  code :`<template>
  <div id="app">
    <HelloWorld msg="Hello Vue in Cogether!" />
  </div>
</template>

<script>
import HelloWorld from "./components/HelloWorld";

export default {
  name: "App",
  components: {
    HelloWorld
  }
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

  `
},{
  filename:"src/main.js",
  type:"file",
  code :`import Vue from "vue";
  import App from "./App.vue";
  
  Vue.config.productionTip = false;
  
  new Vue({
    render: h => h(App)
  }).$mount("#app");
  
  `
}
];
const modely = new Project({
  title:title,
  description:description,
  owner_id:owner_id,
  projectType:projectType,
  source:source
});
try{
  const mod = await modely.save();
  res.send({sttaus:'ok'})

}catch(err){
  res.send({err:'err'});
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
    const deleteCollab = async (url,token,list,project_id) =>{
      try{
        const deletedColl = await fetch(url,
          {method:'DELETE', headers:{
            "Content-Type":'application/json',
            "auth-token":token
          }, body:JSON.stringify({project_id:project_id,idList:list})});
          const json = await deletedColl.json();
          return json;
        } catch (err){
          console.log(err);
        }
    }

    const updateProject= await Project.updateOne(
      {_id:req.body._id},
      {$set:{title:req.body.title,description:req.body.description,last_updated:Date.now()}
    });
    const respond = await deleteCollab(DELETECOLLABORATOR,req.header('auth-token'),req.body.deletedCollab,project._id);
    res.status(200).send({status:"OK"});
  }else{
    req.status(400).send({err:'error to change data'});
  }
});



module.exports = router;
