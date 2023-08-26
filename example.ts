import net from "net";

import wrapper from "./dist/index";
import TerminalPrinter from "./dist/implementation/terminal-printer";

const parse = wrapper(TerminalPrinter);

const server = net.createServer(socket => {
  console.log(`Request from ${socket.remoteAddress}:${socket.remotePort}`);

  socket.once("error", console.error);
  socket.once("close", () => {
    console.log("Disconnected");
  });
  socket.on("data", data => {
    try {
      socket.write(parse(data));
    } catch (err) {
      console.error(err);
    }
  });
});

server.once("error", console.error);

server.listen(9100, () => {
  console.log("Running...");
});
