import * as Noble from 'noble'
import Sensor, { TRIGGER, CHAR } from "./Sensor";
import Bluetooth, { CUE_SENSOR_NAME } from '.';
import delay from '../../util/delay';

export default interface iScannerStrategy
{
    onDiscover(peripheral: Noble.Peripheral): Promise<Sensor>
}

class ScannerStrategy
{
    protected bluetooth: Bluetooth
    
    constructor(bluetooth : Bluetooth) {
        this.bluetooth = bluetooth
    }

    public async onDiscover(peripheral: Noble.Peripheral): Promise<Sensor>
    {
        if(!peripheral) return null
        
		if(this.bluetooth.debug)
			console.log('BLUETOOTH DEVICE FOUND', peripheral.advertisement.localName)

        const { localName } = peripheral.advertisement

		if(localName != CUE_SENSOR_NAME) return null

        return new Sensor(peripheral)
    }
}
export class DefaultScannerStrategy extends ScannerStrategy implements iScannerStrategy
{
    constructor(bluetooth: Bluetooth) { super(bluetooth) }

    public async onDiscover(peripheral: Noble.Peripheral): Promise<Sensor>
    {
        const sensor = await super.onDiscover(peripheral)
        if(!sensor) return null

		if(!this.bluetooth.knows(sensor))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if((!Object.values(TRIGGER).includes(sensor.getTrigger())))	return null

		await this.bluetooth.stopScanning()

		await sensor.touch()
		
		return sensor
    }
}

export class CalibrationScannerStrategy extends ScannerStrategy implements iScannerStrategy
{
    constructor(bluetooth: Bluetooth) { super(bluetooth) }

    public async onDiscover(peripheral: Noble.Peripheral)
    {
        const sensor = await super.onDiscover(peripheral)
        if(!sensor) return null

		if(!this.bluetooth.knows(sensor))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		}

		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if(!(sensor.wasTriggerBy(TRIGGER.BUTTON)
		  || sensor.wasTriggerBy(TRIGGER.BTN)/* LEGACY */))
		{
			return null
		}

		await this.bluetooth.stopScanning()
		await sensor.connect()

		return sensor
    }
}

export class PairingScannerStrategy extends ScannerStrategy implements iScannerStrategy
{
    constructor(bluetooth: Bluetooth) { super(bluetooth) }

    public async onDiscover(peripheral: Noble.Peripheral)
    {
        const sensor = await super.onDiscover(peripheral)
        if(!sensor) return null

		if(this.bluetooth.knows(sensor))
        {
			console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)
		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if(!(sensor.wasTriggerBy(TRIGGER.BUTTON)
			|| sensor.wasTriggerBy(TRIGGER.BTN)/* LEGACY */))
		{
			return null
		}

        this.bluetooth.pairSensor(sensor)

		await this.bluetooth.stopScanning()
		await sensor.touch()
        
        return sensor
    }
}