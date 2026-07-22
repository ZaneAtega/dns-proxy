import dns2, { Packet, UDPClient } from "dns2";

const resolve = UDPClient({ dns: "1.1.1.1" });

const BLOCKED_HOSTS = new Set([

]);

const cache = new Map();

const server = dns2.createServer({
    udp: true,
    handle: async (req, send) => {
        const name = req.questions[0].name.toLowerCase();

        const answer = {
            name,
            type: Packet.TYPE.A,
            class: Packet.CLASS.IN,
            ttl: 300
        };

        if (BLOCKED_HOSTS.has(name)) {
            answer.address = "127.0.0.1";
        } else if (cache.has(name)) {
            answer.address = cache.get(name);
        } else {
            let addr;

            for (let i = 0; i < 5; i++) {
                try {
                    const res = await resolve(name);
                    addr = res.answers[0].address;
                    break;
                } catch {}
            }

            if (addr) {
                answer.address = addr;
                cache.set(name, addr);
            } else {
                return;
            }
        }

        const res = Packet.createResponseFromRequest(req);
        res.answers.push(answer);
        send(res);
    }
});

server.listen({
    udp: {
        port: 53,
        address: "123.123.123.123"
    }
});