#!/usr/bin/env node
/**
 * DDNS script to update cloudflare DNS.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas Malt
 * @license MIT
 */

const request = require("request-promise-native");
const api     = require("./config").api;
const hosts   = require("./config").hosts;
const net     = require("network-address");
const w     = require("winston");

api.key = api.key || process.env.CLOUDFLARE_AUTH_KEY;
api.email = api.email || process.env.CLOUDFLARE_AUTH_EMAIL;

/**
 * Object literal to keep the cloudflare helper functions
 */
const cf = {
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Key": api.key,
    "X-Auth-Email": api.email
  }
};

/**
 * Start of stubs to update the DNS records
 */
cf.handleRecord = function (data) {
  console.log("Told to handle record for:", data.host.name);
  console.log(data);

  if (data.types.includes(data.type)) {
    cf.updateRecord(data);
  } else {
    cf.deleteRecord(data);
  }

};

cf.updateRecord = function (data) {
  console.log("Told to update record: " + data.host.name);
};

cf.deleteRecord = function (data) {
  console.log("Told to delete record: " + data.host.name);
  request({
    method: "DELETE",
    uri: "https://api.cloudflare.com/client/v4/zones/"
      + "3d086ca596f0c9d22c3f99d502b93f2d/dns_records/"
      + data.host.id,
    headers: cf.headers,
    json: true
  })
  .then( (res) => {
    console.log(res);
  })
  .catch( (error) => {
    console.log("got error from delete record:", error.message);
  });
};

cf.fetchIPv4Addr = function () {
  return request("https://ipinfo.io/ip").then( (addr) => addr.trim() );
};

cf.fetchIPv4Addr().then( (addr) => {
  return request({
    "uri": "https://api.cloudflare.com/client/v4/zones/3d086ca596f0c9d22c3f99d502b93f2d/dns_records",
    "headers": {
      "Content-Type": "application/json",
      "X-Auth-Key": api.key,
      "X-Auth-Email": api.email
    },
    "json": true
  })
  .then( (data) => {
    return {
      "addr": {
        "A": addr,
        "AAAA": net.ipv6()
      },
      "data": data
    };
  });
})
.then((data) => {
  for (let item of data.data.result) {
    if(hosts.hasOwnProperty(item.name)) {
      if (hosts[item.name].types.includes(item.type) === false) {
        cf.handleRecord({
          addr: data.addr,
          type: item.type,
          types: hosts[item.name].types,
          host: item
        });
      }
    }
  }
})
.catch((error) => {
  console.log("got error:", error.message);
});
