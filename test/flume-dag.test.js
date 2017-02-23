'use strict';

import test from 'ava';

const flumedag = require('../index');
const timer = require('timers');


let verbose = true;
const prt = (...s)=>{
  if(verbose) console.log(...s);
};


test.cb('test passing args', (t)=>{
  let task = new flumedag.Flume();

  const t1 = (err,req,res,next,from,...p)=>{
    req.v += 2;
    p[0]+='_t1';
    next(from);
  }
  const t2 = (err,req,res,next,from,...p)=>{
    p[0]+='_t2';
    next(from);
  }

  let a = '_a';
  let b = '_b';
  let c = '_c';

  task.use(t2,[t1],a);
  task.use(t1,[],b,a);
  task.use(t1,[],c,a);
  task.start((err,req,res)=>{
    t.end();
  },{'v':3});
});

test.cb('test order of operations', (t)=>{
  let task = new flumedag.Flume();

  const a = (err,req,res,next,from,...args)=>{
    timer.setTimeout(()=>{
      req.v+='a';
      if(next) next(from);
    },1000);
  }
  const b = (err,req,res,next,from,...args)=>{
    timer.setTimeout(()=>{
      req.v+='b';
      if(next) next(from);
    },500);
  }
  const c = (err,req,res,next,from,...args)=>{
    req.v+='c';
    if(next) next(from);
  }
  task.use(c,[a,b]);
  //task.printUse();
  task.start((err,req,res)=>{
    t.is(req.v,'bac');
    t.end();
  },{v:''});
});






