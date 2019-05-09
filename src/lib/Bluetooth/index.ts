import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor from './Sensor';

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : boolean
}

export default class Bluetooth {
	
	private sensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private deviceFoundCallback: 	(sensor: Sensor) => void
	private audioTriggerCallback: 	(sensor: Sensor) => void
	private buttonTriggerCallback: 	(sensor: Sensor) => void

	private defaultScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return
		if(!this.knownSensors.has(peripheral.id)) return

		this.stopScanning()

		const sensor = new Sensor(peripheral)
		
		sensor.connect(null, () => {
			this.stopScanning()
		})

		console.log('SERIVDE DATA', serviceData)

		const serviceDataJSONArray = serviceData
	
		if(serviceDataJSONArray.length < 1) return
		
		const trigger = serviceDataJSONArray[0].uuid

		if(trigger === "4f49445541")
		{
			console.log('AUDIO TRIGGER')
			
			if(this.audioTriggerCallback)
				this.audioTriggerCallback(sensor)
		}
	
		if(trigger === "4e4f54545542")
		{
			console.log('BUTTON TRIGGER')

			if(this.buttonTriggerCallback)
				this.buttonTriggerCallback(sensor)
		}
		
		return true
	}

	public pairingScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return
		if(this.knownSensors.has(peripheral.id)) return

		this.knownSensors.add(peripheral.id)

		return true
	}

	private scannerStrategy: ScannerStrategy = this.defaultScannerStrategy

	private stateChangeActions: Map<string, () => void> = new Map()

	constructor() {
		this.mountHooks()
	}

	private mountHooks()
    {
		Noble.on("stateChange", this.stateChange.bind(this))
		Noble.on("discover", 	this.deviceDiscovered.bind(this))

        Noble.on("scanStart", () => {
            console.log('BLUETOOTH =============================> SCANNING STARTED')
        })

        Noble.on("scanStop", () => {
            console.log('BLUETOOTH =============================> SCANNING STOPPED')
        })
    }

	private stateChange(state: string)
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	private deviceDiscovered(peripheral: Noble.Peripheral)
	{
		if(!this.scannerStrategy(peripheral)) return

		this.stopScanning()

		if(this.deviceFoundCallback)
			this.deviceFoundCallback(new Sensor(peripheral))
	}

	/**
	 * stopScanning
	 */
	private stopScanning(callback?: () => void)
	{
		Noble.stopScanning(callback)
	}
	/**
	 * scan
	 */
	public scan(scannerStrategy?: ScannerStrategy, deviceFoundCallback?: (sensor: Sensor) => void)
	{
		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultScannerStrategy
		this.deviceFoundCallback = (deviceFoundCallback) ? deviceFoundCallback : null

		Noble.startScanning([], true) // any service UUID, duplicates allowed
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void {
		this.audioTriggerCallback = cb
	}

}
