import { Bluetooth } from "../../../src/lib/Bluetooth";
import { Sensor } from "../../../src/lib/Bluetooth/Sensor";
import ScannerStrategy from "../../../src/lib/Bluetooth/ScannerStrategy";
import SensorStub from "./Sensor";
import delay from "../../../src/util/delay";

export default class StubBluetooth implements Bluetooth 
{

    public debug = false
    
    constructor() {}

    knows(sensor: Sensor): boolean
    {
        return false
    }
 
    remember(sensor: Sensor): Promise<void>
    {
        throw new Error("Method not implemented.")
    }

    getConnectedSensor(): Sensor
    {
        return new SensorStub('00a050596aa0')
    }

    disconnectSensor(): void {}

    stopScanning(): Promise<void>
    {
        return
    }

    async scan(scannerStrategy?: ScannerStrategy, deviceDiscoveredCallback?: (sensor: Sensor) => void, scanFilter?: string[]): Promise<void>
    {
        console.log('SCAN INITIALIZED')
        
		console.log('|===> STRATEGY:', (scannerStrategy) ? scannerStrategy.constructor.name : 'default')
        console.log('|===> CALLBACK:', !(!deviceDiscoveredCallback))
        
        await delay(2000)

        if(deviceDiscoveredCallback)
            deviceDiscoveredCallback(new SensorStub('00a050596aa0'))
    }

    forgetSensors(): Promise<void> { return }

    poweredOn(cb: () => void): void
    {
        cb()
    }

    onAudioTrigger(cb: (sensor: Sensor) => void): void {}

    syncSensors(sensors: Array<string>): Promise<void> { return }

    toggleDebug(): void {}
}