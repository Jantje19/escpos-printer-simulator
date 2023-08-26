export enum PaperStatus {
  PRESENT,
  NOT_PRESENT,
}

export enum DrawerStatus {
  LOW,
  HIGH,
}

export enum InkStatus {
  DETECTED,
  NOT_DETECTED,
}

export enum Font {
  // (12x24)
  Font1,
  // (9x17)
  Font2,
  FontA,
  FontB,
  FontC,
  FontD,
  FontE,
  SpecialFontA,
  SpecialFontB,
}

export enum PrintColor {
  Black,
  Red,
}

export enum Justification {
  Left,
  Center,
  Right,
}

export type Config = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  font: Font;
  heightMagnification: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  widthMagnification: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  color: PrintColor;
  justification: Justification;
};

export const initialConfig: Readonly<Config> = Object.freeze<Config>({
  bold: false,
  italic: false,
  underline: false,
  font: Font.Font1,
  heightMagnification: 1,
  widthMagnification: 1,
  color: PrintColor.Black,
  justification: Justification.Left,
});

export type Info = {
  firmwareVersionName: string;
  firmwareVersionCode: number;
  makerName: string;
  modelName: string;
  serialNumber: string;
  modelId: number;

  fontName: string;

  multiByteCharacterSupported: boolean;
  autoCutterInstalled: boolean;
  displayConnected: boolean;
  peelerFunctionAvailable: boolean;
};

export interface Printer {
  get config(): Readonly<Config>;

  get info(): Info;

  feed(lines: number): void;
  text(text: string): void;
  carriageReturn(): void;
  reset(): void;
  print(): void;
  cut(partial: boolean): void;
  cancel(): void;
  beep(
    beepTimeInHundredMs: number,
    beepAmount: number,
    cycleTimeInHundredMs: number
  ): void;
  drawerKickOut(pin: 2 | 5, onTimeInMs: number, offTimeInMs: number): void;

  updateConfig<TKey extends keyof Config>(key: TKey, value: Config[TKey]): void;

  getPaperStatus(): {
    nearEndSensor: PaperStatus;
    endSensor: PaperStatus;
  };
  getDrawerKickOutStatus(): {
    connectorStatus: DrawerStatus;
  };
  getInkStatus(): {
    nearEndSensor: {
      firstColor: InkStatus;
      secondColor: InkStatus;
    };
  };
}
