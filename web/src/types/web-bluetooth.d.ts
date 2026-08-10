// Declarações mínimas da Web Bluetooth API — não faz parte do lib.dom.d.ts padrão
// do TypeScript. Cobre só o que lib/impressoraTermica.ts usa; não é uma tipagem
// completa da spec.

interface BluetoothRemoteGATTCharacteristic {
  readonly properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
}

interface RequestDeviceOptions {
  acceptAllDevices?: boolean;
  optionalServices?: string[];
}

interface Bluetooth {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth?: Bluetooth;
}
