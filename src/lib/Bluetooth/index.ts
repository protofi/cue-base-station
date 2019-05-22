import * as Noble from 'noble'
import Sensor, { TRIGGER } from './Sensor'
import iScannerStrategy, { DefaultScannerStrategy } from './ScannerStrategy';

enum STATE {
	POWER_ON = 'poweredOn'
}

export const CUE_SENSOR_NAME = 'home-cue'

export interface OldScannerStrategy {
	(peripheral: Noble.Peripheral) : Promise<Sensor>
}

export default class Bluetooth {

	public debug = false

	private scanning: boolean = false

	private knownSensors: Set<string> = new Set()

	private audioTriggerCallback: 		(sensor: Sensor) => void = null
	private deviceDiscoveredCallback: 	(sensor: Sensor) => void = null

	private defaultDiscoverStrategy: iScannerStrategy 	= new DefaultScannerStrategy(this)
	private scannerStrategy: iScannerStrategy 			= this.defaultDiscoverStrategy

	private defaultDiscoverCallback = async (sensor: Sensor): Promise<void> =>
	{
		if(this.audioTriggerCallback)
			this.audioTriggerCallback(sensor)
	}

	private stateChangeActions: Map<string, () => void> = new Map()

	constructor()
	{
		Noble.on('stateChange', this.onStateChange.bind(this))
		Noble.on('discover', 	this.onDiscover.bind(this))

		Noble.on('scanStart', () => {
			console.log('BLUETOOTH =============================> SCANNING STARTED')
		})

		Noble.on('scanStop', () => {
			console.log('BLUETOOTH =============================> SCANNING STOPPED')
		})
		
		this.knownSensors.add('00a050cf66d7')
		this.knownSensors.add('00a050596aa0')
	}

	public knows(sensor: Sensor): boolean
	{
		return this.knownSensors.has(sensor.getId())
	}

	public pairSensor(sensor: Sensor): void
	{
		this.knownSensors.add(sensor.getId())
	}

	private onStateChange(state: string): void
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	public disconnectPeripheral(): void
	{
		console.log('DISCONNECTING SENSOR FROM BLE')
		this.scannerStrategy.disconnectPeripheral()
	}

	public stopScanning(): Promise<void>
	{
		this.scanning = false

		return new Promise((resolve, reject) => {
			Noble.stopScanning(resolve)
		})
	}

	public scan(scannerStrategy?: iScannerStrategy, deviceDiscoveredCallback?: (sensor: Sensor) => void, scanFilter: Array<string> = [])
	{
		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultDiscoverStrategy
		this.deviceDiscoveredCallback = (deviceDiscoveredCallback) ? deviceDiscoveredCallback : this.defaultDiscoverCallback

		console.log('SCAN INITIALIZED')

		console.log('|===> STRATEGY:', this.scannerStrategy.constructor.name)
		console.log('|===> CALLBACK:', !(!deviceDiscoveredCallback))

		if(this.scanning)
		{
			console.log('BLUETOOTH =============================> SCANNING CONTINUED')
			return
		}

		Noble.startScanning(scanFilter, true)
		this.scanning = true
	}

	private async onDiscover(peripheral: Noble.Peripheral): Promise<void>
	{
		if(!this.scanning) return

		const sensor: Sensor = await this.scannerStrategy.onDiscover(peripheral)

		if(!sensor) return

		if(this.deviceDiscoveredCallback)
			this.deviceDiscoveredCallback(sensor)
	}

	public forgetSensors()
	{
		this.knownSensors.clear()
	}

	public poweredOn(cb: () => void): any
	{
		this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAudioTrigger(cb: (sensor: Sensor) => void): void
	{
		this.audioTriggerCallback = cb
	}

	public syncSensors(sensors: Array<string>): void
	{
		this.knownSensors.clear()

		sensors.forEach(sensorId => {
			this.knownSensors.add(sensorId)
		})
	}

	public toggleDebug(): void
	{
		this.debug = !this.debug
	}
}
