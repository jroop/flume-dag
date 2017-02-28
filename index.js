'use strict';

((exports)=>{
  /*
  Flume class is used to setup and run a directed acyclic graph
  or tree dependency of functions. Sibling functions in tree will 
  run async if dependancy complete. 
  */

  class Flume{
    constructor(){
      this.jobs = {};
      this.run = true;
      this.pids = []; //list of functions to run
      this.req = {};
      this.res = {};
      this.next = null; //callback
      this.err = null;
    }
    use(func,pre=[],...args){

      let preO = new Set();
      for(let fn of pre){
        //work on setting/registering the pre functions 
        if(!this.jobs.hasOwnProperty(fn.name)){
          //setup a new funciton with info
          this.jobs[fn.name] = {
            'func':fn,
            'args':args,
            'pre':new Set(), //holds name and 0|1
            'post':new Set(), //new function to call func when done
            'ran':0 //0,1,2 not started, running, finished
          };
        }
        this.jobs[fn.name].post.add(func.name);  
        //preO[fn.name] = 0; //0 not done, 1 done
        preO.add(fn.name);
      }
      if(!this.jobs.hasOwnProperty(func.name)){
        this.jobs[func.name] = {
          'func':func,
          'args':args,
          'pre':preO,
          'post':new Set(),
          'ran':0
        };
      }else{
        if(args){
          this.jobs[func.name].args = args; //maybe don't append just overwrite
        }
        if(pre.length > 0){
          for(let k of preO){ 
            //this.jobs[func.name].pre[k] = 0;
            this.jobs[func.name].pre.add(k);
          }
        }
      }
    }
     //listen for certain events then fire if all have completed triggerdone
    start(next=null,req={},res={}){ //invoke only top level ie no pre
      this.next = next;
      this.req = req;
      this.res = res;
      this.err = null;

      //add function to exit and return
      this.res.exit = this.exit.bind(this);

      this.exit(); //clear values if have them
      this.run = true;
      //init the jobs
      for(let fn in this.jobs){
        this.jobs[fn].ran = 0;
      }

      for(let fn in this.jobs){
        if(this.jobs[fn].pre.size == 0){ //top level func
          //bind the run call 
          //go run the func and bind to
          this.jobs[fn].ran = 1; //running
          this.jobs[fn].func(this.err,this.req,this.res,this.funcWrapper.bind(this),fn,...this.jobs[fn].args);
        }
      }
    }
    //called after each function
    funcWrapper(from,err){

      if(err){ //add to an object and skip to functions that have err?
        if(!this.err){
          this.err = {
            errors:{}
          };
        }
        this.err.errors[from] = err;
      }

      if(this.run){
        this.jobs[from].ran = 2; //completed

        if(this.complete()){ //exit on own
          if(this.next) this.next(this.err,this.req,this.res);

        }else{
          //loop over the next funcs to run
          for(let fn of this.jobs[from].post){

            //if the next funcs have not ran 
            if(this.jobs[fn].ran == 0){
              let runCase = true; //check to see if the pre funcs alread run

              //look over the next pre func to see if met if not then don't run
              for(let ifn of this.jobs[fn].pre){
                if(this.jobs[ifn].ran < 2) runCase = false;              
              }
              if(runCase){
                this.jobs[fn].ran = 1; //running
                this.jobs[fn].func(this.err,this.req,this.res,this.funcWrapper.bind(this),fn,...this.jobs[fn].args);
              }
            }
          }
        }
      }else{
        if(this.next) this.next(this.err,this.req,this.res);
      }
    }
    printUse(){
      console.log(this.jobs);
    }
    complete(){
      let done = true;
      for(let fn in this.jobs){
        if(this.jobs[fn].ran < 2){ //not started or running
          done = false;
        }
      }
      return done;
    }
    //attached to res.exit() if want to exit in user function
    //call with res.exit(func) if want to not use start function
    exit(next){
      if(next) this.next = next; //will get called in funcWrapper
      //set exit
      this.run = false;
      //kill all the subprocesses
      for(let fn in this.pids){
        this.pids[fn].func(...this.pids[fn].args);
      }
      this.pids = [];
      //set all processes to finished
      for(let fn in this.jobs){
        this.jobs[fn].ran = 2; //say that everything has ran
      }
    }
    pid(func,...args){
      this.pids.push({'func':func,'args':args});
    }

  }

  exports.Flume = Flume;
})(typeof exports === 'undefined'? this['flumedag']={}: exports)