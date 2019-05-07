import * as Noble from 'noble'
import { Advertisement } from 'noble'

export interface ScanFilter {
	(peripheral: Noble.Peripheral) : boolean
}

export interface DeviceFoundCallback {
	(peripheral: Noble.Peripheral) : void
}

export default class Bluetooth {
	
	private scanning: boolean = false

	private stateChangeActions: Map<string, () => void> = new Map()

	private peripheralName: string = "home-cue"
	private knownPeripherals: Array<string>
	protected peripheral: Noble.Peripheral
	private servicesMap = new Map<string, Noble.Service>()
	private characteristicMap = new Map<string, Map<string, Noble.Characteristic>>()

	public readonly defaultScanFilter: ScanFilter = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) {
			return false
		}
		return peripheral.advertisement.localName === this.peripheralName
	}
	private currentScanFilter: ScanFilter = this.defaultScanFilter
	private prevScanFilter: ScanFilter = null

	/**
	 * Callbacks
	 */
	private currentDeviceFoundCB: DeviceFoundCallback
	private prevDeviceFoundCB: DeviceFoundCallback
	
	private connectHangupCallback: () => void
	private audioAlertCallback: (peripheralId: string) => void
	private peripheralButtonCallback: () => void

	constructor() {
		Noble.on("stateChange", this.onBleStateChange.bind(this))
		Noble.on("discover", this.deviceFound.bind(this))
		Noble.on("scanStart", this.setScanStarted.bind(this))
		Noble.on("scanStop", this.setScanStopped.bind(this))
	}

	/**
	 * onDeviceFound
	 */
	public onDeviceFound(cb: DeviceFoundCallback): void {
		this.currentDeviceFoundCB = cb
	}

	public onConnectHangup(cb: () => void): void {
		this.connectHangupCallback = cb
	}

	public onAudioAlert(cb: (peripheralId: string) => void): void {
		this.audioAlertCallback = cb
	}

	public onPeripheralButton(cb: () => void): void {
		this.peripheralButtonCallback = cb
	}
	
	public poweredOn(cb: () => void): any {
        this.stateChangeActions.set("poweredOn", cb)
    }







	public scan(scanFilter: ScanFilter, cb?: DeviceFoundCallback, once?: boolean): void {
		
		this.prevScanFilter 		= (once) ? this.currentScanFilter : null
		this.currentScanFilter 		= scanFilter

		if(cb) //if callback if parsed
		{
			this.prevDeviceFoundCB = (once) ? this.currentDeviceFoundCB : null
			this.currentDeviceFoundCB = cb
		}
	
		if(Noble.state !== "poweredOn")
		{
			console.error("Scan: Radio not powered on")
			this.scanning = false
			return
		}

		if(this.scanning)
		{
			console.error("Scan: Already scanning")
			return
		}
		
		console.log("Radio powered on, starting scan")
		Noble.startScanning([], true) // any service UUID, duplicates allowed
		this.scanning = true
	}

	private deviceFound(discPeripheral: Noble.Peripheral) 
	{
		if (!this.currentScanFilter(discPeripheral)) return
		if (discPeripheral.state !== "disconnected") return

		Noble.stopScanning()
		this.scanning = false

		/**
		 * Advertisement holds data that we can access 
		 * without having to discover services
		 */
		this.logAdvertisementData(discPeripheral);
		/**
		 * Investigate service data, to see if audio or button trigger is present. 
		 */
		const serviceDataJSONArray = JSON.parse(JSON.stringify(discPeripheral.advertisement.serviceData))
	
		if(serviceDataJSONArray.length < 1) {
			return
		}
		
		console.log("Service data: ", serviceDataJSONArray);

		const trigger = serviceDataJSONArray[0].uuid

		if(trigger === "4f49445541") {
			this.audioAlertCallback(discPeripheral.id)
		}
	
		if(trigger === "4e4f54545542") {
			this.peripheralButtonCallback()
		}
		this.connectPeripheral(discPeripheral)
	}





	public setScanFilter(scanFilter: ScanFilter) {
		this.currentScanFilter = scanFilter
	}

	private setScanStarted() {
		this.scanning = true
	}

	private setScanStopped() {
		this.scanning = false
	}

	private onBleStateChange(state: string) {
	
		console.log('STATE CHANGE: ', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()

	}

	

	private logAdvertisementData(discPeripheral: Noble.Peripheral) {
		const txPowerLevel: number = discPeripheral.rssi
		const localName: string = discPeripheral.advertisement.localName
		
		if (localName) {
			console.log("local name: " + localName)	
		}
		if(txPowerLevel) {
			console.log("tx level: ", txPowerLevel)
		}
		
	}

	private connectPeripheral(discPeripheral: Noble.Peripheral) {
		this.peripheral = discPeripheral
		this.peripheral.once("connect", this.onPeripheralConnect.bind(this))
		this.peripheral.once("disconnect", this.onPeripheralDisconnect.bind(this))

		// handle once request
		this.currentScanFilter = (this.prevScanFilter) ? this.prevScanFilter : this.currentScanFilter
		this.prevScanFilter = null

		this.peripheral.connect(error => console.log)
		this.watchForConnectionTimeout()
	}

	private onPeripheralConnect(keepConnectionAlive: boolean) {
		if(!this.peripheral) {
			return
		}
		console.log(`* Connected to: ${this.peripheral.advertisement.localName}`)
		if(this.currentDeviceFoundCB) this.currentDeviceFoundCB(this.peripheral)

		this.peripheral.discoverAllServicesAndCharacteristics((error, services, chararacteristics) => {
			if(error) {
				console.log("There was an error discovering services: ", error)
			}
			else {
				this.disconnectPeripheral()
			}
			// if(services) populateServiceMap(services)
		})
	}

	public disconnectPeripheral() {
		if(!this.peripheral) {
			console.log("Disconnect: No peripheral to disconnect.")
			return
		}
		this.peripheral.disconnect()
	}

	private onPeripheralDisconnect() {
		this.characteristicMap = new Map<string, Map<string, Noble.Characteristic>>()
		this.servicesMap = new Map<string, Noble.Service>()
	
		if(this.peripheral) {
			console.log(`Disconnecting from: ${this.peripheral.advertisement.localName}`)
		}
		delete this.peripheral
		
		this.scan(this.currentScanFilter, this.currentDeviceFoundCB)
	}

	private watchForConnectionTimeout() {
		let currentTimeoutDuration = 0
		const ConnectionTimeoutInterval = setInterval(() => {
		
		if(this.peripheral && (this.peripheral.state === "connecting" || this.peripheral.state === "disconnecting"))
		{
			currentTimeoutDuration++
			console.log(this.peripheral.state)
		}

		if(currentTimeoutDuration > 10) {
			this.connectHangupCallback()
			currentTimeoutDuration = 0
			clearInterval(ConnectionTimeoutInterval)
		}
		}, 1000)
	}
}
