import * as Noble from 'noble'
import { Advertisement } from 'noble'
import Sensor, { TRIGGER, CHAR } from './Sensor'
import delay from '../../util/delay'
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

	private cueSensorName = 'home-cue'
	private knownSensors: Set<string> = new Set()

	private connectedSensor: Sensor = null

	private heartbeatCallback: 			(sensor: Sensor) => void = null
	private audioTriggerCallback: 		(sensor: Sensor) => void = null
	private deviceDiscoveredCallback: 	(sensor: Sensor) => void = null

	private defaultDiscoverStrategy = new DefaultScannerStrategy(this)
	private scannerStrategy: iScannerStrategy = this.defaultDiscoverStrategy

	private defaultDiscoverCallback = async (sensor: Sensor): Promise<void> =>
	{
		if(this.heartbeatCallback)
			this.heartbeatCallback(sensor)

		if(sensor.wasTriggerBy(TRIGGER.AUDIO)
		|| sensor.wasTriggerBy(TRIGGER.AUD)/* LEGACY */)
		{
			if(this.audioTriggerCallback)
				this.audioTriggerCallback(sensor)
		}

		this.scan()
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
		// this.knownSensors.add('00a050596aa0')
	}

	public knows(sensor: Sensor): boolean
	{
		return this.knownSensors.has(sensor.getId())
	}

	public pairSensor(sensor: Sensor)
	{
		this.knownSensors.add(sensor.getId())
	}

	private onStateChange(state: string)
	{
		console.log('STATE CHANGE:', state)
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	private async onDiscover(peripheral: Noble.Peripheral): Promise<void>
	{
		if(!this.scanning) return

		const sensor: Sensor = await this.scannerStrategy.onDiscover(peripheral)

		if(!sensor) return

		if(this.deviceDiscoveredCallback)
			this.deviceDiscoveredCallback(sensor)
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

	public forgetSensors()
	{
		this.knownSensors.clear()
	}

	public poweredOn(cb: () => void): any
	{
		this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAlert(cb: (sensor: Sensor) => void): void
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
