import {
  Config,
  DrawerStatus,
  Info,
  InkStatus,
  Justification,
  PaperStatus,
  PrintColor,
  Printer,
  initialConfig,
} from "../types";

const escapeCodes = {
  red: "\x1b[31m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  italic: "\x1b[3m",
  bold: "\x1b[1m",
  underline: "\x1b[4m",
  faint: "\x1b[2m",
  reset: "\x1b[0m",
};

const _color = (text: string, color: keyof typeof escapeCodes) =>
  `${escapeCodes[color]}${text}${escapeCodes.reset}`;

type ColorKeys = keyof typeof escapeCodes;

export type ColorType = typeof _color &
  Record<ColorKeys, (text: string) => string>;

const color = _color as ColorType;

(Object.keys(escapeCodes) as ColorKeys[]).forEach(colorName => {
  color[colorName] = (text: string) => color(text, colorName);
});

export const defaultInfo = Object.freeze<Info>({
  multiByteCharacterSupported: false,
  peelerFunctionAvailable: false,
  autoCutterInstalled: true,
  displayConnected: false,
  firmwareVersionCode: 12,
  modelId: 12,
  firmwareVersionName: "0.0.1",
  serialNumber: "NODE",
  makerName: "Jantje19",
  modelName: "NodeJS",
  fontName: "Latin",
});

export default class TerminalPrinter implements Printer {
  static get paperWidth() {
    return 20;
  }

  #buffer: string[] = [];

  #info: Info;

  #config: Config = { ...initialConfig };

  get config() {
    return { ...this.#config };
  }

  get info(): Info {
    return { ...this.#info };
  }

  constructor(info?: Partial<Info>) {
    this.#info = {
      ...defaultInfo,
      ...info,
    };
  }

  text(text: string): void {
    const commands: string[] = [];

    if (this.#config.bold) {
      commands.push(escapeCodes.bold);
    }
    if (this.#config.italic) {
      commands.push(escapeCodes.italic);
    }
    if (this.#config.underline) {
      commands.push(escapeCodes.italic);
    }
    if (this.#config.color === PrintColor.Red) {
      commands.push(escapeCodes.red);
    }

    const getJustificationPadding = (line: string) => {
      switch (this.#config.justification) {
        case Justification.Left:
          return 0;
        case Justification.Right:
          return TerminalPrinter.paperWidth - line.length;
        case Justification.Center:
          return TerminalPrinter.paperWidth / 2 - line.length / 2;
      }
    };

    const wrapLine = (line: string) =>
      Array.from(
        { length: Math.ceil(line.length / TerminalPrinter.paperWidth) },
        (_, index) => {
          const start = TerminalPrinter.paperWidth * index;
          return line.slice(start, start + TerminalPrinter.paperWidth);
        }
      );

    const lines = text
      .split("\n")
      .flatMap(wrapLine)
      .map(line => `${" ".repeat(getJustificationPadding(line))}${line}`);

    this.#buffer.push(...commands, ...lines, escapeCodes.reset);
  }
  feed(lines: number): void {
    this.#buffer.push(...Array.from({ length: lines }, () => "\n"));
  }
  carriageReturn(): void {
    // Empty
  }
  print(): void {
    process.stdout.write(this.#buffer.join("\n"));
    this.#buffer.length = 0;
  }
  reset(): void {
    this.#config = { ...initialConfig };
  }
  cut(partial: boolean): void {
    process.stdout.write(color.faint(partial ? "^" : "-"));
    process.stdout.write(color.faint("-".repeat(19)));
    process.stdout.write("\n");
  }
  cancel(): void {
    this.#buffer.length = 0;
  }
  beep(
    beepTimeInHundredMs: number,
    beepAmount: number,
    cycleTimeInHundredMs: number
  ): void {
    /**
     * Make multiple console beep sounds
     * @param {number} [i] - Number of beeps
     * @param {number} [t] - Milliseconds between beeps
     */
    const beep = (numberOfBeeps: number, delay: number) => {
      const beepNow = () => {
        process.stdout.write("\x07");
      };

      while (numberOfBeeps-- > 0) {
        if (delay * numberOfBeeps === 0) {
          beepNow();
        } else {
          setTimeout(beepNow, numberOfBeeps * delay);
        }
      }
    };

    beep(beepAmount, cycleTimeInHundredMs);
  }
  drawerKickOut(pin: 2 | 5, onTimeInMs: number, offTimeInMs: number): void {
    console.log(
      color.faint(
        `Drawer kick-out on pin ${pin} (${onTimeInMs}-${offTimeInMs})`
      )
    );
  }

  updateConfig<TKey extends keyof Config>(key: TKey, value: Config[TKey]) {
    this.#config[key] = value;
  }

  getPaperStatus(): {
    nearEndSensor: PaperStatus;
    endSensor: PaperStatus;
  } {
    return {
      nearEndSensor: PaperStatus.PRESENT,
      endSensor: PaperStatus.PRESENT,
    };
  }
  getDrawerKickOutStatus(): { connectorStatus: DrawerStatus } {
    return {
      connectorStatus: DrawerStatus.LOW,
    };
  }
  getInkStatus(): {
    nearEndSensor: { firstColor: InkStatus; secondColor: InkStatus };
  } {
    return {
      nearEndSensor: {
        secondColor: InkStatus.DETECTED,
        firstColor: InkStatus.DETECTED,
      },
    };
  }
}
