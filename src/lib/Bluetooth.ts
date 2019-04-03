import * as Noble from 'noble';
import { Advertisement } from 'noble';

export interface ScanFilter {
	(peripheral: Noble.Peripheral) : boolean
}

export interface DeviceFoundCallback {
	(peripheral: Noble.Peripheral) : void
}

export default class Bluetooth {

	private allowedPeripheralName: string = "home-cue"

	protected peripheral: Noble.Peripheral;
	private servicesMap = new Map<string, Noble.Service>();
	private characteristicMap = new Map<string, Map<string, Noble.Characteristic>>();

	public readonly defaultScanFilter: ScanFilter = (peripheral: Noble.Peripheral) => {
		if(peripheral === undefined) {
			return false
		}
		return peripheral.advertisement.localName === this.allowedPeripheralName
	}

	private scanFilter: ScanFilter = this.defaultScanFilter;
	private scanning: boolean = false;

	/**
	 * Callbacks
	 */
	private deviceFoundCallback: DeviceFoundCallback
	private connectHangupCallback: () => void
	private audioAlertCallback: (peripheralId: string) => void
	private peripheralButtonCallback: () => void

	constructor() {
		Noble.on("stateChange", this.onBleStateChange.bind(this))
		Noble.on("discover", this.deviceFound.bind(this))
		Noble.on("scanStart", this.setScanStarted.bind(this))
		Noble.on("scanStop", this.setScanStopped.bind(this))
	}

	public scan(scanFilter: ScanFilter, cb: DeviceFoundCallback): void {
		
		this.scanFilter = scanFilter
		this.deviceFoundCallback = cb
	
		// only start scanning if the bluetooth module is up and running
		if (Noble.state === "poweredOn" && this.scanning === false) {
			console.log("Radio powered on, starting scan")
			Noble.startScanning([], true) // any service UUID, duplicates allowed
			this.scanning = true

		} else {
			console.log("Radio not powered on, stopping scan")
			this.scanning = false
		}
	}

	public setScanFilter(scanFilter: ScanFilter) {
		this.scanFilter = scanFilter
	}

	/**
	 * onDeviceFound
	 */
	public onDeviceFound(cb: DeviceFoundCallback): void {
		this.deviceFoundCallback = cb
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

	/**
	 * disconnectCurrentPeripheral
	 */
	public disconnectPeripheral() {
		if(!this.peripheral) {
		console.log("Disconnect: No peripheral to disconnect.")
		return
		}
		this.peripheral.disconnect()
	}

	private setScanStarted() {
		this.scanning = true
	}

	private setScanStopped() {
		this.scanning = false
	}

	private onBleStateChange(state: string) {
		
		console.log('STATE CHANGE: ', state)
	}

	private deviceFound(discPeripheral: Noble.Peripheral) 
	{
		if (!this.scanFilter(discPeripheral)) return
		if (discPeripheral.state !== "disconnected") return

		/**
		 * Here, we fetch services and data from advertisement,
		 * that we can access without having to discover services
		 */
		const advertisement: Advertisement = discPeripheral.advertisement
		console.log("Found cue-home peripheral with advertisement: ", advertisement)
		const localName: string = advertisement.localName
		const txPowerLevel: number = discPeripheral.rssi
		const manufacturerData: Buffer = advertisement.manufacturerData
		const serviceUuids: string[] = advertisement.serviceUuids

		/**
		 * Investigate service data, to see if audio or button trigger is present. 
		 */
		const serviceDataJSONArray = JSON.parse(JSON.stringify(discPeripheral.advertisement.serviceData));
	
		if(serviceDataJSONArray.length < 1) {
			return;
		}
	
		const trigger = serviceDataJSONArray[0].uuid;

		if(trigger === "4f49445541") {
			this.audioAlertCallback(discPeripheral.id);
		}
	
		if(trigger === "4e4f54545542") {
			this.peripheralButtonCallback();
		}

		this.connectToPeripheral(discPeripheral);
	}

	/**
	 * onPeripheralDisconnect
	 */
	private onPeripheralDisconnect() {
		this.characteristicMap = new Map<string, Map<string, Noble.Characteristic>>();
		this.servicesMap = new Map<string, Noble.Service>();
	
		if(this.peripheral) {
			console.log(`Disconnecting from: ${this.peripheral.advertisement.localName}`);
		}
		delete this.peripheral;
		
		this.scan(this.scanFilter, this.deviceFoundCallback)
	}

	private onPeripheralConnect() {
		if(!this.peripheral) {
			return;
		}
		console.log(`* Connected to: ${this.peripheral.advertisement.localName}`);
		this.deviceFoundCallback(this.peripheral);
	}

	private connectToPeripheral(discPeripheral: Noble.Peripheral) {
		this.peripheral = discPeripheral;
		this.peripheral.once("connect", this.onPeripheralConnect.bind(this));
		this.peripheral.once("disconnect", this.onPeripheralDisconnect.bind(this));

		Noble.stopScanning();
		this.scanning = false;

		this.peripheral.connect(error => console.log);
		this.watchForConnectionTimeout();
	}

	private watchForConnectionTimeout() {
		let currentTimeoutDuration = 0;
		const ConnectionTimeoutInterval = setInterval(() => {
		if(this.peripheral.state === "connecting" || this.peripheral.state === "disconnecting") {
			currentTimeoutDuration++;
			console.log(this.peripheral.state);
		}

		if(currentTimeoutDuration > 10) {
			this.connectHangupCallback();
			currentTimeoutDuration = 0;
			clearInterval(ConnectionTimeoutInterval);
		}
		}, 1000);
	}
}
