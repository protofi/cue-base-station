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
	private deviceFoundCallback: (sensor: Sensor) => void
	private audioTriggerCallback: (sensor: Sensor) => void

	private periphralsBeingHandled: Set<string> = new Set()

	private defaultScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return
		if(!this.knownSensors.has(peripheral.id)) return

		if(this.periphralsBeingHandled.has(peripheral.id))
		{
			console.log('SENSOR ALREADY BEING HANDLED', peripheral.id)
		}

		this.periphralsBeingHandled.add(peripheral.id)

		console.log('PERIPHRALS BEING HANDLED', this.periphralsBeingHandled)

		this.stopScanning()

		const sensor = new Sensor(peripheral)
		
		sensor.connect()

		console.log('SERIVDE DATA', serviceData)

		const serviceDataJSONArray = serviceData
	
		if(serviceDataJSONArray.length < 1) return
		
		const trigger = serviceDataJSONArray[0].uuid

		if(trigger === "4f49445541") {
			console.log('AUDIO TRIGGER')
			
			this.audioTriggerCallback(sensor)
		}
	
		if(trigger === "4e4f54545542") {
			// this.peripheralButtonCallback()
			console.log('BUTTON TRIGGER')
		}

		this.periphralsBeingHandled.delete(peripheral.id)
		
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
            console.log('SCANNING STARTED')
        })

        Noble.on("scanStop", () => {
            console.log('SCANNING STOPPED')
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

		this.deviceFoundCallback(new Sensor(peripheral))
	}

	/**
	 * stopScanning
	 */
	private stopScanning()
	{
		Noble.stopScanning()
	}
	/**
	 * scan
	 */
	public scan(scannerStrategy?: ScannerStrategy, deviceFoundCallback?: (sensor: Sensor) => void)
	{
		if(scannerStrategy) this.scannerStrategy = scannerStrategy
		if(deviceFoundCallback) this.deviceFoundCallback = deviceFoundCallback

		Noble.startScanning([], true) // any service UUID, duplicates allowed
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void {
		this.audioTriggerCallback = cb
	}

}
