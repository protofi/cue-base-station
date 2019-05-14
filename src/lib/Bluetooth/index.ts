import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor, { TRIGGER } from './Sensor';

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : Promise<Sensor>
}

export default class Bluetooth {
	
	private scanning: boolean = false

	private cueSensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private connectedSensor: Sensor = null

	private heartbeatCallback: 		(sensor: Sensor) => void = null
	private deviceFoundCallback: 	(sensor: Sensor) => void = null
	private audioTriggerCallback: 	(sensor: Sensor) => void = null
	private buttonTriggerCallback: 	(sensor: Sensor) => void = null

	private defaultScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral) => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor = new Sensor(peripheral)

		if(!this.knownSensors.has(sensor.getId()))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)

		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if((!Object.values(TRIGGER).includes(sensor.getTrigger())))
		{
			return null
		}

		await this.stopScanning()

		sensor.touch(() => {
			this.scan()

			if(this.heartbeatCallback)
				this.heartbeatCallback(sensor)
		})

		if(sensor.wasTriggerBy(TRIGGER.AUDIO)
		|| sensor.wasTriggerBy(TRIGGER.AUD))
		{
			if(this.audioTriggerCallback)
				this.audioTriggerCallback(sensor)
		}
		
		// if(sensor.wasTriggerBy(TRIGGER.BUTTON)
		// || sensor.wasTriggerBy(TRIGGER.BTN))
		// {
		// 	if(this.buttonTriggerCallback)
		// 		this.buttonTriggerCallback(sensor)
		// }

		return sensor
	}

	public pairingScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral) => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor: Sensor = new Sensor(peripheral)

		if(this.knownSensors.has(sensor.getId()))
		{
			console.log('KNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		} 

		console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`)

		console.log('TRIGGER', `(${sensor.getTrigger()})`, (!Object.values(TRIGGER).includes(sensor.getTrigger()) ? 'UNKNOWN' : 'KNOWN'))

		if((!Object.values(TRIGGER).includes(sensor.getTrigger())))
		{
			return null
		}

		if(!(sensor.wasTriggerBy(TRIGGER.BUTTON)
		  || sensor.wasTriggerBy(TRIGGER.BTN)))
		{
			return null
		}

		this.knownSensors.add(sensor.getId())

		await this.stopScanning()

		sensor.touch(() => {
			this.scan()

			if(this.heartbeatCallback)
				this.heartbeatCallback(sensor)
		})
		
		return sensor
	}

	public calibrationScannerStrategy: ScannerStrategy = async (peripheral: Noble.Peripheral) => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor: Sensor = new Sensor(peripheral)

		if(!this.knownSensors.has(sensor.getId()))
		{
			console.log('UNKNOWN CUE SENSOR FOUND', `(${sensor.getId()})`, 'KEEPS SCANNING')
			return null
		}

		await this.stopScanning()

		sensor.connect(() => {
			console.log('CHARACTERISTICS', sensor.getCharacteristics())
			console.log('SERVICES', sensor.getServices())

			sensor.disconnect()
		})
		
		return sensor
	}

	private scannerStrategy: ScannerStrategy = this.defaultScannerStrategy

	private stateChangeActions: Map<string, () => void> = new Map()

	constructor() {
		
		Noble.on("stateChange", this.onStateChange.bind(this))
		Noble.on("discover", 	this.onDiscover.bind(this))

        Noble.on("scanStart", () => {
            console.log('BLUETOOTH =============================> SCANNING STARTED')
        })

        Noble.on("scanStop", () => {
            console.log('BLUETOOTH =============================> SCANNING STOPPED')
        })
    }

	private onStateChange(state: string)
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	private async onDiscover(peripheral: Noble.Peripheral): Promise<void>
	{
		if(!peripheral) return
		if(!this.scanning) return

		const sensor: Sensor = await this.scannerStrategy(peripheral)

		if(!sensor) return

		if(this.deviceFoundCallback)
			this.deviceFoundCallback(sensor)
	}

	public disconnectPeripheral()
	{
		console.log('DISCONNECTING SENSOR FROM BLE')

		if(this.connectedSensor)
		{
			this.connectedSensor.disconnect()
		}
		else
		{
			console.log('NO SENSOR FOUND')
		}
	}

	/**
	 * stopScanning
	 */
	public stopScanning(): Promise<void>
	{
		this.scanning = false
		return new Promise((resolve, reject) => {
			Noble.stopScanning(resolve)
		})
	}
	/**
	 * scan
	 */
	public scan(scannerStrategy?: ScannerStrategy, deviceFoundCallback?: (sensor: Sensor) => void)
	{
		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultScannerStrategy
		this.deviceFoundCallback = (deviceFoundCallback) ? deviceFoundCallback : null

		console.log('SCAN INITIALIZED')

		if(this.scannerStrategy == this.defaultScannerStrategy)
		{
			console.log('|===> STRATEGY: default')
			console.log('|===> CALLBACK:', !(!deviceFoundCallback))
		}
		else if(this.scannerStrategy == this.pairingScannerStrategy){
			console.log('|===> STRATEGY: pairing')
			console.log('|===> CALLBACK:', !(!deviceFoundCallback))
		}

		if(this.scanning)
		{
			console.log('BLUETOOTH =============================> SCANNING CONTINUED')
			return
		}

		Noble.startScanning([], true) // any service UUID, duplicates allowed
		this.scanning = true
	}

	/**
	 * forgetSensors
	 */
	public forgetSensors()
	{
		this.knownSensors.clear()
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void {
		this.audioTriggerCallback = cb
	}

	public onButton(cb: (sensor: Sensor) => void): void {
		this.buttonTriggerCallback = cb
	}

	/**
	 * onHeartbeat
	 */
	public onHeartbeat(cb: (sensor: Sensor) => void): void {
		this.heartbeatCallback = cb
	}

	/**
	 * syncSensors
	 */
	public syncSensors(sensors: Array<string>) {
		sensors.forEach(sensorId => {
			this.knownSensors.add(sensorId)
		})
	}

}
