#!/usr/bin/env node
/**
 * DDNS script to update cloudflare DNS.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas Malt
 * @license MIT
 */

const api     = require("./config").api;
const hosts   = require("./config").hosts;
const version = require("./package").version;
const request = require("request-promise-native");
const net     = require("network-address");
const winston     = require("winston");

var w = new (winston.Logger)({
  level: "debug",
  transports: [
    new (winston.transports.Console)({
      "timestamp": true
    })
  ]
});

// Setting up the API access defaults.
api.key   = api.key   || process.env.CLOUDFLARE_AUTH_KEY;
api.email = api.email || process.env.CLOUDFLARE_AUTH_EMAIL;
api.zones = api.zones || process.env.CLOUDFLARE_ZONES;

w.cli();
w.info(`Starting cloudfare DDNS updater v${version}`);
w.info("Updating the following hosts:");
for (let host of Object.keys(hosts)) {
  w.info(`  ${host} - ${hosts[host].types}`);
}

/**
 * Object literal to keep the cloudflare helper functions
 */
const cf = {
  uriroot: `https://api.cloudflare.com/client/v4/zones/${api.zones}/dns_records`,
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Key": api.key,
    "X-Auth-Email": api.email
  },
  seen: {}
};

/**
 * Start of stubs to update the DNS records
 */
cf.handleDNSRecord = function (data) {
  if (data.types.includes(data.type)) {
    cf.updateDNSRecord(data);
  } else {
    cf.deleteDNSRecord(data);
  }
};

/**
 * Updates an exisitng DNS record on cloudflare
 */
cf.updateDNSRecord = (data) => {
  w.info(`    told to update record: ${data.host.name} - ${data.host.type}`);
  w.debug(JSON.stringify(data));

  return request({
    method: "PUT",
    uri: `${cf.uriroot}/${data.host.id}`,
    headers: cf.headers,
    body: {
      type: data.type,
      name: data.host.name,
      content: data.addr[data.host.type]
    },
    json: true
  })
  .then( (res) => {
    w.info("result:", res);
    if (res.success === true) {
      w.info("      Update successful!");
    }
    else {
      w.error("     Update failed!");
      w.debug(JSON.stringify(res));
      process.exit(1);
    }
  })
  .catch( (error) => {
    w.error("got error in updateDNSRecord:", error.message, error);
    process.exit(1);
  });
};


cf.deleteDNSRecord = function (data) {
  w.info("Told to delete record: " + data.host.name);
  request({
    method: "DELETE",
    uri: `${cf.uriroot}/${data.host.id}`,
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

/**
 * Process the received records.
 */
cf.iterateOverRecords = (records) => {
  let results = {
    data: records,
    updates: []
  };

  for (let item of records.data.result) {
    if(hosts.hasOwnProperty(item.name) === false) {
      continue;
    }

    w.info(`  Processing ${item.name} - ${item.type}`);

    if (hosts[item.name].types.includes(item.type)) {
      if (item.content === records.addr[item.type]) {
        w.info("    addresses equal - Nothing to do");
      }
      else {
        w.info("    addresses not equal - updating record");
        results.updates[results.updates.length] = cf.updateDNSRecord({
          addr: records.addr,
          type: item.type,
          types: hosts[item.name].types,
          host: item
        })
        .then( (res) => {
          w.info("    update done:", JSON.stringify(res));
        });
      }

      if (!cf.seen.hasOwnProperty(item.name)) {
        cf.seen[item.name] = {};
      }
      cf.seen[item.name][item.type] = 1;

      continue;
    } else {
      w.info("    record has wrong type - dealing with it");
      results.updates[results.updates.length] = cf.handleDNSRecord({
        addr: records.addr,
        type: item.type,
        types: hosts[item.name].types,
        host: item
      });
    }
  }

  return results;
};

/**
 * Fetches the external IPv4 address from one of the service providers
 * available
 *
 * @return Promise
 */
cf.fetchIPv4Addr = () => {
  w.info("Fetching external IP address:");

  return request("https://ipinfo.io/ip")
    .then( (addr) => addr.trim() )
    .then( (addr) => {
      let addresses = {
        "A": addr,
        "AAAA": net.ipv6()
      };
      w.info(`     A - ${addresses.A}`);
      w.info(`  AAAA - ${addresses.AAAA}`);

      return addresses;
    })
    .catch( (err) => {
      w.error("Got an error fetching external IP addresses:", err.message);
      process.exit(1);
    });
};

cf.createDNSRecord = (data) => {
  request({
    method: "POST",
    uri: cf.uriroot,
    headers: cf.headers,
    body: data,
    json: true
  })
  .then( (res) => {
    w.info("Created DNS Record: ", JSON.stringify(res));
  })
  .catch( (err) => {
    w.error("Got error from createDNSRecord:", err.message);
  });
};

cf.addMissingRecords = (data) => {
  w.info("Adding missing records");
  w.debug("  seen:", JSON.stringify(cf.seen));
  w.debug("  hosts", JSON.stringify(hosts));

  let results = {
    "data": data,
    "updates": []
  };

  for (let key of Object.keys(hosts)) {
    w.debug("  key: ", key);
    if (cf.seen.hasOwnProperty(key)) {
      for (let type of hosts[key].types) {
        if (cf.seen[key].hasOwnProperty(type)) {
          w.debug(`    ${type} record in place - nothing to do`);
        } else {
          w.debug(`    ${type} record missing - adding record`);
          results.updates[results.updates.length] = cf.createDNSRecord({
            "type": type,
            "name": key,
            "content": data.records.addr[type]
          });
        }
      }
    }
    else {
      w.debug(`Did not find any record for ${key} - adding records ${hosts[key].types}`);
    }
  }

  w.info("Done processing DNS records");
  return results;
};

/**
 * @return Promise with JSON from cloudflare.
 */
cf.fetchDNSRecords = (addr) => {
  w.info("Fetching info about existing DNS records");

  return request({
    method: "GET",
    uri: cf.uriroot,
    headers: cf.headers,
    json: true
  })
  .then( (data) => {
    return {
      "addr": addr,
      "data": data
    };
  })
  .catch( (err) => {
    w.error("Could not fetch DNS Records:", err.statusCode);
    for (let e of err.error.errors) {
      w.error(`  ${e.code} - ${e.message}`);
    }
    process.exit(1);
  });
};

cf.fetchIPv4Addr()
.then(cf.fetchDNSRecords)
.then(cf.iterateOverRecords)
.then(cf.addMissingRecords)
.catch((error) => {
  console.log(error);
  console.log("got error:", error.message);
});
