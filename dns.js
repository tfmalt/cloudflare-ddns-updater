const cp = require('child_process').spawn;

const dig = cp(
      '/usr/bin/dig', 
      ['+short', 'myip.opendns.com', '@resolver1.opendns.com']
    );

dig.stdout.on('data', (data) => {
  console.log("got data:", data);
});

dig.on('close', (code) => {
  console.log("process closed:", code);
});

dig.stderr.on('data', (data) => {
  console.log("got error:", data);
});
