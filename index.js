require('events').EventEmitter.defaultMaxListeners = 0;
const ProxyAgent = require('proxy-agent'),
    request = require('request'),
    chalk = require('chalk'),
    path = require('path'),
    fs = require('fs'),
    args = process.argv.splice(2),
    proxies = fs.readFileSync(args[0], 'utf-8').replace(/\r/g, '').split('\n').filter(Boolean);

//Return usage on lower then required argv length
if (args.length < 2) return console.log(`Usage: node ${path.basename(__filename)} {proxies.txt} {timeout}`);

class Checker {
    constructor(timeout, nProxy) {
        this.proxy_type = ['http', 'socks4', 'socks5'];
        this.n_proxy = nProxy;
        this.timeout = timeout;
        this.working = 0;
        this.not_working = 0;
        this.checked = 0;
        this.dead = chalk.hex('#D32F2F')('[DEAD] -> %s');
        this.alive = chalk.hex('#388E3C')('[%s] -> %s');
    }

    title(text) {
        if (process.platform === 'win32') {
            process.title = text;
        } else {
            process.stdout.write('\x1b]2;' + text + '\x1b\x5c');
        }
    }

    check(proxy) {
        //Loop true the length of proxy_type (in this case each proxy will be checked three times)
        for (let i = 0; i < this.proxy_type.length; ++i) {
            let proxy_type = this.proxy_type[i],
                options = {
                    uri: 'http://example.com',
                    method: 'GET',
                    agent: new ProxyAgent(proxy_type + '://' + proxy),
                    timeout: Number(this.timeout)
                };

            request.get(options, (error, response) => {
                //If proxy is dead then add to not_working
                if (error) {
                    console.log(this.dead, proxy);
                    return ++this.not_working;
                }

                //Check if body contains Example
                if (response.body.includes('Example')) {
                    //Save proxy to file
                    fs.appendFile(proxy_type.toUpperCase() + '.txt', proxy + '\n', (err) => {
                        if (err) throw err;

                        console.log(this.alive, proxy_type.toUpperCase(), proxy);
                        return ++this.working;
                    });
                } else {
                    //If does not have Example in body add to not_working
                    console.log(this.dead, proxy);
                    ++this.not_working;
                }

                //Log in title the proxy stats
                let total_working = this.not_working + this.working;
                this.title(`ALIVE: ${this.working}/${this.n_proxy} | CHECK: ${total_working}`);
            });


            //If the loop true proxy_type is done then add to checked
            if (i >= this.proxy_type.length - 1) {
                return ++this.checked;
            }
        }
    }
}

const client = new Checker(args[1], proxies.length);

let start = setInterval(() => {
    //If checked proxies are greater or equal to number of proxies then initialize stop
    if (client.checked >= client.n_proxy) {
        clearInterval(start);
        WaitNStop();
    }

    //check the proxy from the index of client.checked
    client.check(proxies[client.checked]);
});

//Simply wait until not working + working is greater or equal to numbers of proxy then exit
function WaitNStop() {
    setInterval(() => {
        if (client.not_working + client.working >= client.n_proxy) {
            console.log(chalk.hex('#388E3C')('DONE !\nWORKING: ' + client.working + '\nBAD: ' + client.not_working));
            process.exit(0)
        }
    });
}

start;
