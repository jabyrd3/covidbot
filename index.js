const irc = require('irc');
const Bypasser = require('node-bypasser');
const config = require('./config');
const promisify = require('util').promisify;
const https = require('https');
const sortBy = require('lodash.sortby');
// fuck you
Array.prototype.sortBy = sortBy;

https.get[promisify.custom] = function getAsync(options) {
  return new Promise((resolve, reject) => {
    https.get(options, (response) => {
      response.end = new Promise((resolve) => response.on('end', resolve));
      resolve(response);
    }).on('error', reject);
  });
};
const get = promisify(https.get);
  
console.log('joining', config.chan);

const client  = new irc.Client('irc.slashnet.org', config.ircn, {
    channels: [config.chan]
});


// irc server
client.addListener('error', (e)=>{
	console.log(e);
});
client.addListener('join', (c, n, m)=>{
});
client.addListener('part', (c, n) => {
});
client.addListener('invite', () => {
  console.log('bot invited');
  client.join(config.chan);
});
client.addListener('message', async (f,t,m) => {
  console.log(m);
  if(m.indexOf('cvns states') === 0){
    let sickness;
    try{
    const response = await get('https://corona.lmao.ninja/states'); 
    let body = '';
    response.on('data', chunk => body += chunk);
    await response.end;
    const sickness = JSON.parse(body);
      console.log(sickness);
    const parsed = sortBy(
        sickness, 'cases')
      .reverse()
      .slice(0, 5)
      .reduce((acc, val, idx) => {
        console.log('val', val);
        return acc.concat([`${val.state} ${val.deaths}/${val.cases}/${val.active} `]);
      }, ['   # deaths/cases/active # ']);
    return parsed.map(l=>client.say(config.chan, l));
    }catch(e){
      return console.log(e);
    }
  }
  if(m.indexOf('cvns') === 0){
    console.log(m.indexOf('cvns'));
    const response = await get('https://corona.lmao.ninja/countries?sort=cases'); 
    let body = '';
    response.on('data', chunk => body += chunk);
    await response.end;
    const lines = JSON.parse(body).slice(0, 6)
      .reduce((acc, val) => acc.concat([`${val.country} ${val.deaths}/${val.cases}/${val.active}/${val.critical}`]), ['   # deaths/cases/active/critical #']);
    lines.map(l=>client.say(config.chan, l));
  }
});
