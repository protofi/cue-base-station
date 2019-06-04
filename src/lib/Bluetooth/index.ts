import * as Noble from 'noble'
import * as fs from 'fs'
import { Sensor } from './Sensor'
import ScannerStrategy, { DefaultScannerStrategy } from './ScannerStrategy';

enum STATE {
	POWER_ON = 'poweredOn'
}

export const CUE_SENSOR_NAME = 'home-cue'

export interface Bluetooth
{
	debug: boolean
    knows(sensor: Sensor): boolean
	remember(sensor: Sensor): Promise<void>
	getConnectedSensor(): Sensor
	disconnectSensor(): void
	stopScanning(): Promise<void>
	scan(scannerStrategy?: ScannerStrategy, deviceDiscoveredCallback?: (sensor: Sensor) => void, scanFilter?: Array<string>): Promise<void>
	forgetSensors(): Promise<void>
	poweredOn(cb: () => void): void
	onAudioTrigger(cb: (sensor: Sensor) => void): void
	syncSensors(sensors: Array<string>): Promise<void>
	toggleDebug(): void
}

export default class BluetoothImpl implements Bluetooth
{
	public debug: boolean = false

	private scanning: boolean = false

	private knownSensors: Set<string>

	private audioTriggerCallback: 		(sensor: Sensor) => void = null
	private deviceDiscoveredCallback: 	(sensor: Sensor) => void = null

	private defaultDiscoverStrategy: ScannerStrategy 	= new DefaultScannerStrategy(this)
	private scannerStrategy: ScannerStrategy 			= this.defaultDiscoverStrategy

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
		
		const sensorIds = fs.readFileSync('./data/known-sensors.json', { encoding : 'utf8'})
		
		console.log('KNOWN SENSORS', sensorIds)

		this.knownSensors = (sensorIds) ? new Set(Array.from(JSON.parse(sensorIds))) : new Set()
	}

	public knows(sensor: Sensor): boolean
	{
		return this.knownSensors.has(sensor.getId())
	}

	public async remember(sensor: Sensor): Promise<void>
	{
		this.knownSensors.add(sensor.getId())

		return this.persistKnownSensors()
	}

	private async persistKnownSensors(): Promise<void>
	{
		const sensorIds = JSON.stringify(Array.from(this.knownSensors))

		console.log('KNOWN SENSORS ARRAY', sensorIds)

		return new Promise((resolve, reject) => {
			fs.writeFile('./data/known-sensors.json',
				sensorIds,
				error => {
					if (error) return reject('SENSOR COULD NOT BE REMEMBERED: \n' + error)

					const exec = require('child_process').exec

					exec('sh ./persist-known-sensors.sh', (error: string) => {
						if (error) return reject('SENSOR COULD NOT BE REMEMBERED: \n' + error)

						resolve()
					})
				}
			)
		})
	}

	private onStateChange(state: string): void
	{
		console.log('STATE CHANGE:', state)
		
		const action = this.stateChangeActions.get(state)
		if(action) action()
	}

	public getConnectedSensor()
	{
		return this.scannerStrategy.getConnectedSensor()
	}

	public disconnectSensor(): void
	{
		this.scannerStrategy.disconnectSensor()
	}

	public stopScanning(): Promise<void>
	{
		this.scanning = false

		return new Promise((resolve, reject) => {
			Noble.stopScanning(resolve)
		})
	}

	public async scan(scannerStrategy?: ScannerStrategy, deviceDiscoveredCallback?: (sensor: Sensor) => void, scanFilter: Array<string> = []) : Promise<void>
	{
		try{ await this.disconnectSensor() } catch(e){}

		this.scannerStrategy = (scannerStrategy) ? scannerStrategy : this.defaultDiscoverStrategy
		this.deviceDiscoveredCallback = (deviceDiscoveredCallback) ? deviceDiscoveredCallback : this.defaultDiscoverCallback

		console.log('SCAN INITIALIZED')

		console.log('|===> STRATEGY:', this.scannerStrategy.constructor.name)
		console.log('|===> CALLBACK:', !(!deviceDiscoveredCallback))

		if(this.scanning)
			await this.stopScanning()

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

	public async forgetSensors(): Promise<void>
	{
		this.knownSensors.clear()
		return this.persistKnownSensors()
	}

	public poweredOn(cb: () => void): void
	{
		this.stateChangeActions.set(STATE.POWER_ON, cb)
	}

	public onAudioTrigger(cb: (sensor: Sensor) => void): void
	{
		this.audioTriggerCallback = cb
	}

	public async syncSensors(sensors: Array<string>): Promise<void>
	{
		this.knownSensors.clear()

		sensors.forEach(sensorId => {
			this.knownSensors.add(sensorId)
		})

		return this.persistKnownSensors()
	}

	public toggleDebug(): void
	{
		this.debug = !this.debug
	}
}
