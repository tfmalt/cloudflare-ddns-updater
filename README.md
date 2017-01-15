# cloudflare-ddns-updater

A simple script to update dynamic DNS records through [cloudflare](https://www.cloudflare.com). Provided in case anyone finds it
useful.

To use it you have to have an account with cloudflare and use them as your
DNS provider. The script is written in node.js and tested with node.js 7.4
on MacOS Sierra and Ubuntu 16.10.

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

You will find your **API key** and your **zone id** from the **Overview**
page in your account.  
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

If you want you can now install the script globally to make it easy to use.
Just make sure the configuration is valid first.
```bash
$ npm install . -g
```
