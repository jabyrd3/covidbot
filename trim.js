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
const simpleGet = async (url) => {
  const response = await get(url);
  let body = '';
  response.on('data', chunk => body += chunk);
  await response.end;
  return body;
};

let counties;

const getCounties = async () => {
  const response = await simpleGet('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv')
  counties = response.split('\n').slice(1).reduce((acc, county)=>{
  const fields = county.split(',');
  const objd = {
    date: fields[0],
    county: fields[1],
    state: fields[2],
    fips: fields[3],
    cases: fields[4],
    deaths: fields[5]
  };

  return Object.assign({}, acc, {
    [`${objd.county.toLowerCase()} county, ${objd.state}`]: objd
  }); 
  }, {
  });
  setTimeout(getCounties, 360000);
};
getCounties();

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
const generic = async () => {
    const response = await simpleGet('https://corona.lmao.ninja/countries/usa'); 
    const us = JSON.parse(response);
    client.say(config.chan, `Total: ${us.deaths}d / ${us.cases}a | Today: ${us.todayDeaths}d / ${us.todayCases}a `);
};

const zips = async param => {
  console.log(param);
  let key, county, countyKeys;
  switch (parseInt(param).toString()){
    case 'NaN':
      countyKeys = Object.keys(counties);
      key = countyKeys.find(k => k.toLowerCase().indexOf(param.toLowerCase()) > -1);
      county = counties[key];
      client.say(config.chan, `${county.county} county, ${county.state}: ${county.cases}c/${county.deaths}d as of ${county.date}`);
    break;
    default:
      const res = await simpleGet(`https://jordanbyrd.com/zips/${param}`);
        console.log(res);
      const zip = JSON.parse(res);
      countyKeys = Object.keys(counties).filter(ck => console.log(zip.state, ck) || ck.split(',')[1].trim().toLowerCase() === zip.state.toLowerCase());
      console.log(countyKeys);
      key = countyKeys.find(c=>c.toLowerCase().indexOf(zip.county.toLowerCase()) > -1);
      if(!key){
        return client.say(config.chan, 'Sorry, couldn\'t find that county');
      }
      county = counties[key];
      if(!county){
        return client.say(config.chan, 'The dataset\'s a bit messy, try using part of the county  name');
      }
      client.say(config.chan, `${county.county} county, ${county.state}: ${county.cases}c/${county.deaths}d as of ${county.date}`);
    break;
  } 
}
client.addListener('message', async (f,t,m) => {
  console.log(m);
  if(m.indexOf(config.ircn) === 0 && m.length > 5){
    return zips(m.slice(4)); 
  }
  if(m.indexOf(config.ircn) === 0){
    generic();
  }
});
