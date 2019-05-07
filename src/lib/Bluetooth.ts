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

	private scannerTimestamp = 0
	private peripheralName: string = "home-cue"
	private knownPeripherals: Set<string> = new Set()
	protected currentPeripheral: Noble.Peripheral

	private servicesMap = new Map<string, Noble.Service>()
	private characteristicMap = new Map<string, Map<string, Noble.Characteristic>>()

	public readonly defaultScanFilter: ScanFilter = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return false

		const { localName } = peripheral.advertisement

		return localName === this.peripheralName && this.knownPeripherals.has(peripheral.id)
	}

	public readonly pairingScanFilter: ScanFilter = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return false

		const { localName } = peripheral.advertisement

		return localName === this.peripheralName && !this.knownPeripherals.has(peripheral.id)
	}

	private currentScanFilter: ScanFilter = this.defaultScanFilter
	private prevScanFilter: ScanFilter = null

	private scannerStrategy = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) return false

		const { localName } = peripheral.advertisement

		if(localName != this.peripheralName) return false
		
		if(this.knownPeripherals.has(peripheral.id)) return false

		this.knownPeripherals.add(peripheral.id)

		if(this.currentDeviceFoundCB)
			this.currentDeviceFoundCB(peripheral)

		return true
	}
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
		
		console.log('STARTING SCAN')

		if(Noble.state !== "poweredOn")
		{
			console.error("DENIED: Radio is not powered on")
			this.scanning = false
			return
		}

		if(this.scanning)
		{
			console.error("DENIED: Already scanning")
			return
		}
		
		this.prevScanFilter 		= (once) ? this.currentScanFilter : null
		this.currentScanFilter 		= scanFilter

		if(cb) //if callback if parsed
		{
			console.log('SETTING SCAN CALLBACK')
			this.prevDeviceFoundCB = (once) ? this.currentDeviceFoundCB : null
			this.currentDeviceFoundCB = cb
		}
	
		this.scannerTimestamp = Date.now()
		Noble.startScanning([], true) // any service UUID, duplicates allowed
		this.scanning = true
	}

	private deviceFound(peripheral: Noble.Peripheral) 
	{
		if(!this.scannerStrategy(peripheral)) return

		// if (!this.currentScanFilter(peripheral)) return
		// if (peripheral.state !== "disconnected") return

		this.stopScaning()

		// /**
		//  * Advertisement holds data that we can access 
		//  * without having to discover services
		//  */
		// this.logAdvertisementData(peripheral);
		// /**
		//  * Investigate service data, to see if audio or button trigger is present. 
		//  */
		// const serviceDataJSONArray = JSON.parse(JSON.stringify(peripheral.advertisement.serviceData))
	
		// if(serviceDataJSONArray.length < 1) {
		// 	return
		// }
		
		// console.log("Service data: ", serviceDataJSONArray);

		// const trigger = serviceDataJSONArray[0].uuid

		// if(trigger === "4f49445541") {
		// 	this.audioAlertCallback(peripheral.id)
		// }
	
		// if(trigger === "4e4f54545542") {
		// 	this.peripheralButtonCallback()
		// }
		// this.connectPeripheral(peripheral)
	}

	public stopScaning() {
		console.log('STOP SCANNING')
		Noble.stopScanning()
		this.scanning = false
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
		this.currentPeripheral = discPeripheral
		this.currentPeripheral.once("connect", this.onPeripheralConnect.bind(this))
		this.currentPeripheral.once("disconnect", this.onPeripheralDisconnect.bind(this))

		// handle once request
		this.currentScanFilter = (this.prevScanFilter) ? this.prevScanFilter : this.currentScanFilter
		this.prevScanFilter = null

		this.currentPeripheral.connect(error => console.log)
		this.watchForConnectionTimeout()
	}

	private onPeripheralConnect(keepConnectionAlive: boolean) {
		if(!this.currentPeripheral) {
			return
		}
		console.log(`* Connected to: ${this.currentPeripheral.advertisement.localName}`)
		if(this.currentDeviceFoundCB) this.currentDeviceFoundCB(this.currentPeripheral)

		this.currentPeripheral.discoverAllServicesAndCharacteristics((error, services, chararacteristics) => {
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
		if(!this.currentPeripheral) {
			console.log("Disconnect: No peripheral to disconnect.")
			return
		}
		this.currentPeripheral.disconnect()
	}

	private onPeripheralDisconnect() {
		this.characteristicMap = new Map<string, Map<string, Noble.Characteristic>>()
		this.servicesMap = new Map<string, Noble.Service>()
	
		if(this.currentPeripheral) {
			console.log(`Disconnecting from: ${this.currentPeripheral.advertisement.localName}`)
		}
		delete this.currentPeripheral
		
		this.scan(this.currentScanFilter, this.currentDeviceFoundCB)
	}

	private watchForConnectionTimeout() {
		let currentTimeoutDuration = 0
		const ConnectionTimeoutInterval = setInterval(() => {
		
		if(this.currentPeripheral && (this.currentPeripheral.state === "connecting" || this.currentPeripheral.state === "disconnecting"))
		{
			currentTimeoutDuration++
			console.log(this.currentPeripheral.state)
		}

		if(currentTimeoutDuration > 10) {
			this.connectHangupCallback()
			currentTimeoutDuration = 0
			clearInterval(ConnectionTimeoutInterval)
		}
		}, 1000)
	}
}
