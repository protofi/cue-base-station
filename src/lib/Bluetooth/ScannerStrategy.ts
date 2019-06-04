import * as Noble from 'noble'
import SensorImpl, { Sensor, TRIGGER } from "./Sensor";
import { Bluetooth, CUE_SENSOR_NAME } from '.';

export default interface ScannerStrategy
{
	onDiscover(peripheral: Noble.Peripheral): Promise<Sensor>
	disconnectSensor(): Promise<void>
	getConnectedSensor(): Sensor
	connectToSensor(sensor: Sensor): Promise<void>
}

abstract class AbstractScannerStrategy
{
	protected bluetooth: Bluetooth
	protected connectedSensor: Sensor
    
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

        return new SensorImpl(peripheral)
	}

	public getConnectedSensor(): Sensor
	{
		return this.connectedSensor
	}
	
	public async disconnectSensor(): Promise<void>
	{
		if(this.connectedSensor)
			await this.connectedSensor.disconnect()

		delete this.connectedSensor
	}

	public async connectToSensor(sensor: Sensor): Promise<void>
	{
		await sensor.connect()

		try
		{
			if(this.connectedSensor)
				await this.connectedSensor.disconnect()
		}
		catch(e)
		{
			console.log('ERROR', e)
		}

		this.connectedSensor = sensor
	}
}
export class DefaultScannerStrategy extends AbstractScannerStrategy implements ScannerStrategy
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

		// If sensor was not triggered by audio, continue scanning
		if(!(sensor.wasTriggerBy(TRIGGER.AUDIO)
		|| sensor.wasTriggerBy(TRIGGER.AUD))/* LEGACY */)
		{
			return null
		}

		await this.bluetooth.stopScanning()

		return sensor
    }
}

export class CalibrationScannerStrategy extends AbstractScannerStrategy implements ScannerStrategy
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

		await this.connectToSensor(sensor)

		return sensor
    }
}

export class PairingScannerStrategy extends AbstractScannerStrategy implements ScannerStrategy
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

        await this.bluetooth.remember(sensor)

		await this.bluetooth.stopScanning()
		await sensor.touch()
        
        return sensor
    }
}