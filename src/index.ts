import Stream from "./stream";
import {
  DrawerStatus,
  Font,
  InkStatus,
  Justification,
  PaperStatus,
  PrintColor,
  Printer,
} from "./types";

export { default as Drawer } from "./implementation/drawer";
export * from "./types";

enum Command {
  ESC = 0x1b,
  GS = 0x1d,
  FS = 0x1c,
  US = 0x1f,
  DLE = 0x10,
  // Print and feed 1 line
  FF = 0x0c,
  // Print and paper feed to the right black bar
  SO = 0x0e,
  // Line feed
  LF = 0x0a,
  // Print and carriage return
  CR = 0xd,
  // Horizontal tab
  HT = 0x09,
  // Cancel current line
  CAN = 0x18,
}

enum EscCommand {
  Initialize = 0x40,
  SelectJustification = 0x61,
  SelectPrintMode = 0x21,
  EmphasisMode = 0x45,
  PrintAndFeed = 0x64,
  AbsolutePrintPosition = 0x24,
  RelativePrintPosition = 0x5c,
  SelectFontA = 0x50,
  SelectFontC = 0x54,
  SelectFontD = 0x55,
  PaperStatus = 0x76,
  PrintPaperAndFeed = 0x4a,
  UnderlineMode = 0x2d,
  ItalicsMode = 0x34,
  SelectCharacterFont = 0x4d,
  NinetyDegreesRotation = 0x56,
  SelectCharacterPage = 0x74,
  UpsideDownMode = 0x7b,
  SetCPIMode = 0xc1,
  DoubleStrikeMode = 0x47,
  RightSideCharacterSpacing = 0x20,
  LineSpacing = 0x33,
  SelectOneSixthInchLineSpacing = 0x32,
  SelectOneEighthInchLineSpacing = 0x30,
  LeftMargin = 0x4c,
  MotionUnits = 0x50,
  PrintAreaWidth = 0x57,
  FullCut = 0x6d,
  PartialCut = 0x69,
  PrintGraphicLogo = 0xfa,
  SelectPrintColor = 0x72,
  Buzzer = 0x28,
  UndocumentedBuzzer = 0x42,
  GeneratePulse = 0x70,
}

enum GsCommand {
  // Print and paper feed to the label gap
  FF = 0x0c,
  Status = 0x99,
  SelectCharacterSize = 0x21,
  ToggleInvertedPrinting = 0x42,
  SetLeftMargin = 0x4c,
  DefineDownloadBitImages = 0x2a,
  PrintDownloadBitImages = 0x2f,
  SetBarCodeHeight = 0x68,
  SetBarCodeHorizontalSize = 0x77,
  SelectHRICharacterPrintPos = 0x48,
  SelectHRICharacterFont = 0x66,
  PrintBarCode = 0x6b,
  Select2DBarCode = 0x5a,
  PrintCurve = 0x27,
  PrintCurveCharacter = 0x22,
  Dynamic2DBarCode = 0x28,
  CutPaper = 0x56,
  Ejector = 0x65,
  PrinterId = 0x49,
  TransmitStatus = 0x72,
}

type CommandHandler = (printer: Printer, stream: Stream) => Uint8Array | void;

const handleEsc: CommandHandler = (printer, stream) => {
  const type = stream.next().unwrap();

  const handleSelectPrintMode = (printer: Printer, n: number) => {
    const font = (n & 0x01) === 0 ? Font.Font1 : Font.Font2;
    const bold = (n & 0x08) !== 0;
    const doubleHeight = (n & 0x10) !== 0;
    const doubleWidth = (n & 0x20) !== 0;
    const underline = (n & 0x80) !== 0;

    printer.updateConfig("font", font);
    printer.updateConfig("bold", bold);
    printer.updateConfig("underline", underline);
    printer.updateConfig("widthMagnification", doubleWidth ? 2 : 1);
    printer.updateConfig("heightMagnification", doubleHeight ? 2 : 1);
  };

  const handleSelectPrintColor = (printer: Printer, n: number) => {
    const color = (() => {
      switch (n) {
        case 0x00:
        case 0x30:
          return PrintColor.Black;
        case 0x01:
        case 0x31:
          return PrintColor.Red;
        default:
          throw new Error(`Invalid print color argument (0x${n.toString(16)})`);
      }
    })();

    printer.updateConfig("color", color);
  };

  const handleSelectJustification = (printer: Printer, n: number) => {
    const justification = (() => {
      switch (n) {
        case 0x00:
        case 0x30:
          return Justification.Left;
        case 0x01:
        case 0x31:
          return Justification.Center;
        case 0x02:
        case 0x32:
          return Justification.Right;
        default:
          throw new Error(
            `Invalid justification argument (0x${n.toString(16)})`
          );
      }
    })();

    printer.updateConfig("justification", justification);
  };

  const handleSelectCharacterFont = (printer: Printer, n: number) => {
    const font = (() => {
      switch (n) {
        case 0x00:
        case 0x30:
          return Font.FontA;
        case 0x01:
        case 0x31:
          return Font.FontB;
        case 0x02:
        case 0x032:
          return Font.FontC;
        case 0x03:
        case 0x033:
          return Font.FontD;
        case 0x04:
        case 0x034:
          return Font.FontE;
        case 0x61:
          return Font.SpecialFontA;
        case 0x62:
          return Font.SpecialFontB;
        default:
          throw new Error(
            `Invalid character font argument (0x${n.toString(16)})`
          );
      }
    })();

    printer.updateConfig("font", font);
  };

  const handleSetEmphasisMode = (printer: Printer, n: number) => {
    if (n > 1) {
      throw new Error(`Invalid emphasis mode argument (0x${n.toString(16)})`);
    }

    printer.updateConfig("bold", n === 1);
  };

  const handleBuzzer = (printer: Printer, stream: Stream) => {
    stream.next().unwrap();
    const [pL, pH] = stream.take(2);
    const amountOfFollowingBytes = pL + pH * 256;

    if (amountOfFollowingBytes > 4) {
      throw new Error(
        `Buzzer command received too many arguments (${amountOfFollowingBytes})`
      );
    }

    const [fn, n, c, t] = stream.take(amountOfFollowingBytes);

    if (fn !== 48) {
      throw new Error(
        `Buzzer function of 0x${fn.toString(16)} is not implemented or invalid`
      );
    }

    printer.beep(n, c, t);
  };

  const handleGeneratePulse = (printer: Printer, stream: Stream) => {
    // The pulse for ON time is (t1 × 2 msec) and for OFF time is (t2 × 2 msec).
    // If t2 < t1, the OFF time is equal to the ON time.

    const [m, t1, t2] = stream.take(3);

    const onTime = t1 * 2;
    const offTime = Math.max(t2, t1) * 2;

    switch (m) {
      // Drawer kick-out connector pin 2
      case 0x00:
      case 0x30:
        printer.drawerKickOut(2, onTime, offTime);

        break;
      // Drawer kick-out connector pin 5
      case 0x01:
      case 0x31:
        printer.drawerKickOut(5, onTime, offTime);
        break;
      default:
        throw new Error(
          `Invalid generate pulse argument (0x${m.toString(16)})`
        );
    }
  };

  switch (type) {
    case EscCommand.Initialize:
      printer.reset();
      break;
    case EscCommand.SelectPrintMode:
      handleSelectPrintMode(printer, stream.next().unwrap());
      break;
    case EscCommand.SelectPrintColor:
      handleSelectPrintColor(printer, stream.next().unwrap());
      break;
    case EscCommand.SelectJustification:
      handleSelectJustification(printer, stream.next().unwrap());
      break;
    case EscCommand.SelectCharacterFont:
      handleSelectCharacterFont(printer, stream.next().unwrap());
      break;
    case EscCommand.EmphasisMode:
      handleSetEmphasisMode(printer, stream.next().unwrap());
      break;
    case EscCommand.Buzzer:
      handleBuzzer(printer, stream);
      break;
    case EscCommand.UndocumentedBuzzer:
      // "n" Refers to the number of buzzer times. "t" Refers to the buzzer sound length in (t * 100) milliseconds.
      const [n, t] = stream.take(2);
      printer.beep(t, n, t * 2);
      break;
    case EscCommand.GeneratePulse:
      handleGeneratePulse(printer, stream);
      break;
    default:
      throw new Error(`Invalid ESC command (0x${type.toString(16)})`);
  }
};

const handlePrinterId = (printer: Printer, stream: Stream) => {
  const textEncoder = new TextEncoder();
  const type = stream.next().unwrap();

  const makeAPacket = (data: Buffer) =>
    Buffer.from([0x3d, 0x21, ...data, 0x00]);

  const makeBPacket = (data: Uint8Array) => {
    if (data.length > 80) {
      throw new Error(`Printer ID packet too long (${data.toString()})`);
    }

    return new Uint8Array([0x5f, ...data, 0x00]);
  };

  const {
    makerName,
    modelName,
    serialNumber,
    modelId,
    firmwareVersionName,
    firmwareVersionCode,
    autoCutterInstalled,
    displayConnected,
    multiByteCharacterSupported,
    peelerFunctionAvailable,
  } = printer.info;

  // Printer ID: Model ID
  if (type === 0x01 || type === 0x31) {
    return new Uint8Array([modelId]);
  }
  // Printer ID: Type ID
  else if (type === 0x02 || type === 0x32) {
    let byte = 0;

    if (multiByteCharacterSupported) {
      byte |= 0x01;
    }
    if (autoCutterInstalled) {
      byte |= 0x02;
    }
    if (displayConnected) {
      byte |= 0x04;
    }

    return new Uint8Array([byte]);
  }
  // Printer ID: Version ID
  else if (type === 0x03 || type === 0x33) {
    return new Uint8Array([firmwareVersionCode]);
  }
  // A: Type info
  else if (type === 0x21) {
    let firstByte = 0x00;
    let thirdByte = 0x00;

    if (multiByteCharacterSupported) {
      firstByte |= 0x01;
    }

    if (autoCutterInstalled) {
      firstByte |= 0x02;
    }

    if (displayConnected) {
      firstByte |= 0x04;
    }

    firstByte |= 0x40;

    if (peelerFunctionAvailable) {
      thirdByte |= 0x01;
    }

    thirdByte |= 0x40;

    return makeAPacket(Buffer.from([firstByte, 0x40, thirdByte]));
  }
  // A: Model specific
  else if ([0x23, 0x24, 0x60, 0x6e].includes(type)) {
    // There's nothing in the docs about this...
    return makeAPacket(Buffer.alloc(0));
  }
  // B: Firmware version
  else if (type === 0x41) {
    return makeBPacket(textEncoder.encode(firmwareVersionName));
  }
  // B: Maker name
  else if (type === 0x42) {
    return makeBPacket(textEncoder.encode(makerName));
  }
  // B: Model name
  else if (type === 0x43) {
    return makeBPacket(textEncoder.encode(modelName));
  }
  // B: Serial number
  else if (type === 0x44) {
    return makeBPacket(textEncoder.encode(serialNumber));
  }
  // B: Font of language
  else if (type === 0x45) {
    return makeBPacket(new Uint8Array());
  }
  // B: Model specific
  else if (type === 0x6f || type === 0x70) {
    return makeBPacket(new Uint8Array());
  }

  throw new Error("Invalid printer ID request");
};

// https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=124
const handleStatus = (printer: Printer, stream: Stream) => {
  const type = stream.next().unwrap();

  // Paper status
  if (type === 0x01 || type === 0x31) {
    const status = printer.getPaperStatus();

    let byte = 0;

    if (status.nearEndSensor === PaperStatus.NOT_PRESENT) {
      byte |= 0x03;
    }
    if (status.endSensor === PaperStatus.NOT_PRESENT) {
      byte |= 0x0c;
    }

    return new Uint8Array([byte]);
  }
  // Drawer status
  else if (type === 0x02 || type === 0x32) {
    const status = printer.getDrawerKickOutStatus();

    let byte = 0;

    if (status.connectorStatus === DrawerStatus.HIGH) {
      byte |= 0x01;
    }

    return new Uint8Array([byte]);
  }
  // Ink status
  else if (type === 0x04 || type === 0x34) {
    const status = printer.getInkStatus();

    let byte = 0;

    if (status.nearEndSensor.firstColor === InkStatus.DETECTED) {
      byte |= 0x01;
    }
    if (status.nearEndSensor.secondColor === InkStatus.DETECTED) {
      byte |= 0x02;
    }

    return new Uint8Array([byte]);
  }

  throw new Error("Invalid status request");
};

const handleCutPaper = (printer: Printer, stream: Stream) => {
  const m = stream.next().unwrap();

  // Function A: Executes paper cut
  if (m === 0x00 || m === 0x30) {
    printer.cut(false);
    return;
  }
  if (m === 0x01 || m === 0x31) {
    printer.cut(true);
    return;
  }

  printer.feed(stream.next().unwrap());

  // Function B: Feeds paper to [cutting position + (n × vertical motion unit)] and executes paper cut
  if (m === 0x41) {
    printer.cut(false);
    return;
  }
  if (m === 0x42) {
    printer.cut(true);
    return;
  }

  // Function C: Preset [cutting position + (n × vertical motion unit)] to the paper cutting position,
  //  and executes paper cut when it reaches the autocutter position after printing and feeding
  if (m === 0x61) {
    printer.cut(false);
    return;
  }
  if (m === 0x62) {
    printer.cut(true);
    return;
  }

  // Function D: Feeds paper to [cutting position + (n × vertical motion unit)] and executes paper cut,
  //  then moves paper to the print start position by reverse feeding.
  if (m === 0x67) {
    printer.cut(false);
    return;
  }
  if (m === 0x68) {
    printer.cut(true);
    return;
  }

  throw new Error("Invalid paper cut message: " + m.toString(16));
};

const handleSelectCharacterSize = (printer: Printer, stream: Stream) => {
  const n = stream.next().unwrap();

  const width = (() => {
    switch (n) {
      case 0x70:
        return 8;
      case 0x60:
        return 7;
      case 0x50:
        return 6;
      case 0x40:
        return 5;
      case 0x30:
        return 4;
      case 0x20:
        return 3;
      case 0x10:
        return 2;
      case 0x00:
      default:
        return 1;
    }
  })();

  const height = (() => {
    switch (n) {
      case 0x07:
        return 8;
      case 0x06:
        return 7;
      case 0x05:
        return 6;
      case 0x04:
        return 5;
      case 0x03:
        return 4;
      case 0x02:
        return 3;
      case 0x01:
        return 2;
      case 0x00:
      default:
        return 1;
    }
  })();

  printer.updateConfig("widthMagnification", width);
  printer.updateConfig("heightMagnification", height);
};

const handleGs: CommandHandler = (printer, stream) => {
  const type = stream.next().unwrap();

  switch (type) {
    case GsCommand.CutPaper:
      return handleCutPaper(printer, stream);
    case GsCommand.PrinterId:
      return handlePrinterId(printer, stream);
    case GsCommand.TransmitStatus:
      return handleStatus(printer, stream);
    case GsCommand.SelectCharacterSize:
      return handleSelectCharacterSize(printer, stream);
    default:
      throw new Error(`Invalid GS command (0x${type.toString(16)})`);
  }
};

const commandHandlers: Record<string, CommandHandler> = {
  [Command.ESC]: handleEsc,
  [Command.GS]: handleGs,
  [Command.LF]: printer => {
    printer.print();
    printer.feed(1);
  },
  [Command.CAN]: printer => {
    printer.cancel();
  },
  // [Command.FS]: () => 0,
  // [Command.US]: () => 0,
  // [Command.DLE]: () => 0,
  // [Command.FF]: () => 0,
  // [Command.SO]: () => 0,
  // [Command.CR]: () => 0,
  // [Command.HT]: () => 0,
};

interface PrinterConstructor {
  new (): Printer;
}

export default (printerConstructor: Printer | PrinterConstructor) =>
  (data: Uint8Array) => {
    const printer =
      typeof printerConstructor === "function"
        ? new printerConstructor()
        : printerConstructor;

    const textDecoder = new TextDecoder();
    const stream = new Stream(data);

    const output = [];
    for (const command of stream) {
      if (!(command in commandHandlers)) {
        // Assume ASCII
        if (command <= 127) {
          let i = 0;

          for (
            let next = stream.peekAt(i);
            next !== undefined;
            next = stream.peekAt(i)
          ) {
            if (next in commandHandlers || next > 127) {
              break;
            }
            i++;
          }

          const buffer = i > 0 ? [command, ...stream.take(i)] : [command];
          printer.text(textDecoder.decode(new Uint8Array(buffer)));

          continue;
        }

        throw new Error(`Command not implemented (0x${command.toString(16)})`);
      }

      const result = commandHandlers[command](printer, stream);
      if (result) {
        output.push(...result);
      }
    }

    return new Uint8Array(output);
  };
