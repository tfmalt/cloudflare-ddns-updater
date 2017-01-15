# cloudflare-ddns-updater

This is a simple script to update dynamic DNS records through [cloudflare](https://www.cloudflare.com). It's provided in case anyone finds it
useful.

To use it you have to have an account with cloudflare and use them as your
DNS provider. The script is written in [node.js](https://nodejs.org/en/) and tested with [node.js 7.4](https://nodejs.org/en/)
on **MacOS Sierra** and [Ubuntu 16.10](https://www.ubuntu.com/).

## Setup and configuration

First clone the repository to somewhere on your system:
```bash
$ git clone https://github.com/tfmalt/cloudflare-ddns-updater.git
$ cd cloudflare-ddns-updater
```
Copy the file **config_example.json** to **config.json** and edit it to
suit your needs:

```bash
$ cp config_example.json config.json
$ vim config.json
```

You will find your **API key** and your **zone id** in the **Overview**
page of your cloudflare account.  
```javascript
{
  "api": {
    "key": "<your cloudflare api key>",
    "email": "your.email@example.org",
    "zones": "<the cloudflare zone you want to update>"
  },
  "hosts": {
    "ssh.example.org": {
      "types": ["A", "AAAA"]
    },
    "vpn.example.org": {
      "types": ["A", "AAAA"]
    }
  }
}
```

## Install

Make sure the configuration is valid and then you can install the script
globally to make it easy to use:

```bash
$ npm install . -g
```
