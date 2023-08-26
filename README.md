# escpos-printer-simulator

This package attempts to simulate an ESCPOS printer.

There is an example printer implementation that simply formats the ESCPOS commands to the terminal: `TerminalPrinter`. You can use it as an example for how to implement your own renderer.

## Example

```ts
import net from "net";

import wrapper from "escpos-printer-simulator";
import TerminalPrinter from "escpos-printer-simulator/implementation/terminal-printer.js";

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
```
