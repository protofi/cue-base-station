import { Sensor, CHAR, TRIGGER } from "../../../src/lib/Bluetooth/Sensor";

export default class SensorStub implements Sensor
{
    private id: string
    private rssi: number

    constructor(id: string)
    {
        this.id = id
    }

    async touch(): Promise<void> { return }
    async connect(): Promise<void> { return }
    async disconnect(): Promise<void> { return }
    async fetchServicesAndCharacteristics(): Promise<void> { return }

    getCharacteristic(uuid: CHAR): Promise<import("noble").Characteristic> {
        throw new Error("Method not implemented.");
    }

    getCharacteristics(): Map<string, import("noble").Characteristic> {
        throw new Error("Method not implemented.");
    }
    
    getServiceData(): { uuid: string; data: Buffer; }[] {
        throw new Error("Method not implemented.");
    }

    wasTriggerBy(trigger: TRIGGER): boolean {
        throw new Error("Method not implemented.");
    }

    getTrigger(): string {
        throw new Error("Method not implemented.");
    }
    
    async readCharacteristic(uuid: CHAR): Promise<Buffer>
    {
        return Buffer.from(['1234'])
    }

    async writeValue(value: number, uuid: CHAR): Promise<void> {
        throw new Error("Method not implemented.");
    }

    getRssi(): number {
        return this.rssi
    }

    getId(): string {
        return this.id
    }
    
    getAdvertisment(): import("noble").Advertisement
    {
        throw new Error("Method not implemented.");
    }
}