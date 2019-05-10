import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor, { TRIGGER } from './Sensor';
import { disconnect } from 'cluster';

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : Sensor
}

export default class Bluetooth {
	
	private scanning: boolean = false

	private cueSensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private connectedSensor: Sensor = null

	private deviceFoundCallback: 	(sensor: Sensor) => void = null
	private audioTriggerCallback: 	(sensor: Sensor) => void = null
	private buttonTriggerCallback: 	(sensor: Sensor) => void = null

	private defaultScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor = new Sensor(peripheral)

		if(!this.knownSensors.has(sensor.id)) return null

		console.log('KNOWN SENSOR FOUND')

		this.stopScanning()

		sensor.touch(() => {
			this.scan()
		})

		console.log('TRIGGER:', sensor.getTrigger())

		if(sensor.wasTriggerBy(TRIGGER.AUDIO))
		{
			if(this.audioTriggerCallback)
				this.audioTriggerCallback(sensor)
		}
		
		if(sensor.wasTriggerBy(TRIGGER.BUTTON))
		{
			if(this.buttonTriggerCallback)
				this.buttonTriggerCallback(sensor)
		}

		return sensor
	}

	public pairingScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {

		const { localName } = peripheral.advertisement

		if(localName != this.cueSensorName) return null

		const sensor: Sensor = new Sensor(peripheral)

		if(this.knownSensors.has(sensor.id)) return null

		console.log('UNKNOWN SENSOR FOUND:', sensor.id)

		if(!sensor.wasTriggerBy(TRIGGER.BUTTON))
		{
			console.log('NOT TRIGGERS BY BUTTON')
			console.log('TRIGGERED BY: ', sensor.getTrigger())
			return null
		}

		console.log('TRIGGERS BY BUTTON')
		
		this.knownSensors.add(sensor.id)

		this.stopScanning()

		sensor.touch(() => {
			this.scan()
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

	private onDiscover(peripheral: Noble.Peripheral)
	{
		if(!peripheral) return
		if(!this.scanning) return

		const sensor: Sensor = this.scannerStrategy(peripheral)
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
	private stopScanning(callback?: () => void)
	{
		this.scanning = false
		Noble.stopScanning(callback)
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
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void {
		this.audioTriggerCallback = cb
	}

}
