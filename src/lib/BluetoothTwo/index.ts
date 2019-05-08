import * as Noble from 'noble'
import { Advertisement } from 'noble'

export default class Bluetooth {
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

	}

	/**
	 * scan
	 */
	public scan() {
		Noble.startScanning([], true) // any service UUID, duplicates allowed
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set("poweredOn", cb)
    }
}
