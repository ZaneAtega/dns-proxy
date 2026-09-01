import fs from "fs";
import dns2, { Packet, UDPClient } from "dns2";
import customRules from "./custom-rules.js";

const loadList = file =>
    [...fs.readFileSync(file, "utf8").matchAll(/^(?!\s*\/\/).*?"([^"]*)"/gm)].map(m => m[1]);

const HOSTNAMES = new Set(loadList("./hostnames.txt"));
const DOMAINS = new Set(loadList("./domains.txt"));
const STARTS_WITH = ["mdp-appconf", "conn-service", "clients"];
const SUBSTRINGS = ["mozilla", "opera", "play", "ads"];
const ENDS_WITH = ["mtalk.google.com", "data.microsoft.com"];

const hosts = new Map(
    fs.readFileSync("./hosts", "utf8").split(/\r?\n/).map(line => line.split(' ').reverse())
);

const resolve = UDPClient({ dns: "1.1.1.1" });

dns2.createServer({
    udp: true,
    handle: async (req, send) => {
        const name = req.questions[0].name.toLowerCase();
        const domain = name.split('.').slice(-2).join('.');

        const answer = {
            name,
            type: Packet.TYPE.A,
            class: Packet.CLASS.IN,
            ttl: 300
        };

        if (
            HOSTNAMES.has(name) ||
            DOMAINS.has(domain) ||
            STARTS_WITH.some(x => name.startsWith(x)) ||  domain.startsWith("gvt") ||
            SUBSTRINGS.some(x => name.includes(x)) ||
            ENDS_WITH.some(x => name.endsWith(x)) ||
            customRules(name, domain)
        ) {
            answer.address = "127.0.0.1";
        } else if (hosts.has(name)) {
            answer.address = hosts.get(name);
        } else {
            console.log(name);

            let addr;

            for (let i = 0; i < 5; i++) {
                try {
                    const res = await resolve(name);
                    addr = res.answers.find(x => x.address)?.address;
                    if (addr) break;
                } catch {}
            }

            if (addr) {
                answer.address = addr;
                hosts.set(name, addr);
            } else {
                return;
            }
        }

        const res = Packet.createResponseFromRequest(req);
        res.answers.push(answer);
        send(res);
    }
}).listen({
    udp: {
        port: 53,
        address: "0.0.0.0"
    }
});

process.on("SIGINT", () => {
    fs.writeFileSync("./hosts", [...hosts].map(([hostname, ip]) => `${ip} ${hostname}`).join("\n"));
});