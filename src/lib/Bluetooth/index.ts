import * as Noble from 'noble'
import { Advertisement } from 'noble'

enum STATE {
	POWER_ON = 'poweredOn'
}

export interface ScannerStrategy {
	(peripheral: Noble.Peripheral) : void
}


export default class Bluetooth {

	private sensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private defaultScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return
		if(!this.knownSensors.has(peripheral.id)) return

		console.log('SERIVDE DATA', serviceData)

		const serviceDataJSONArray = serviceData
	
		if(serviceDataJSONArray.length < 1) return
		
		const trigger = serviceDataJSONArray[0].uuid

		if(trigger === "4f49445541") {
			// this.audioAlertCallback(peripheral.id)
			console.log('AUDIO TRIGGER')
		}
	
		if(trigger === "4e4f54545542") {
			// this.peripheralButtonCallback()
			console.log('BUTTON TRIGGER')
		}
	}

	public pairingScannerStrategy: ScannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return

		const { localName, serviceData } = peripheral.advertisement

		if(localName != this.sensorName) return
		if(this.knownSensors.has(peripheral.id)) return

		this.knownSensors.add(peripheral.id)

		Noble.stopScanning()
	}

	private scannerStrategy: ScannerStrategy = this.defaultScannerStrategy

	private stateChangeActions: Map<string, () => void> = new Map()

	constructor() {
		// Noble.on("stateChange", this.onBleStateChange.bind(this))
		// Noble.on("discover", this.deviceFound.bind(this))
		// Noble.on("scanStart", this.setScanStarted.bind(this))
		// Noble.on("scanStop", this.setScanStopped.bind(this))
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
		this.scannerStrategy(peripheral)
	}

	/**
	 * scan
	 */
	public scan(scannerStrategy?: ScannerStrategy)
	{
		if(scannerStrategy) this.scannerStrategy = scannerStrategy
		
		Noble.startScanning([], true) // any service UUID, duplicates allowed
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set(STATE.POWER_ON, cb)
    }
}
