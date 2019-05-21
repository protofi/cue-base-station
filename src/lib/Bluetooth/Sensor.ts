import * as Noble from 'noble'

export enum TRIGGER {
	AUD 	= '4f49445541',
	BTN 	= '4e4f54545542',
	AUDIO 	= 'AUDIO',
	BUTTON 	= 'BUTTON',
}

export enum CHAR {
	THRESHOLD_LEVEL = '4b6c4032d9ff4e01a95bc8ef20a1e5e8',
	MAX_AUDIO_LEVEL	= '7429e850281e4b6287fdcee6980735d2',
	RSSI_LEVEL 		= '05855503fbbf4fbb85bb41b87804d3c2',
}

export enum STATE {
	ERROR 			= 'error',
	CONNECTED 		= 'connected',
	CONNECTING 		= 'connecting',
	DISCONNECTED 	= 'disconnected',
	DISCONNECTING 	= 'disconnecting',
}
export default class Sensor {
	
	private serviceUUIDs: Array<string> = []
	
	private characteristicUUIDs: Array<string> = [
		CHAR.THRESHOLD_LEVEL,
		CHAR.RSSI_LEVEL
	]

    private id: string
	private rssi: number
	
	private state: STATE

    private peripheral: Noble.Peripheral
    private characteristics: Array<Noble.Characteristic>
	private services: Array<Noble.Service>
	private stateChecker: NodeJS.Timeout

	private connectedPromiseResolution:  (value?: void | PromiseLike<void>) => void
	private disconnectPromiseResolution: (value?: void | PromiseLike<void>) => void

    constructor(peripheral: Noble.Peripheral)
    {
        this.peripheral = peripheral
        this.id 		= peripheral.id
		this.rssi 		= peripheral.rssi
	}
	
	public async touch(): Promise<void>
	{
		console.log('TOUCHING SENSOR')

		await this.connect()
		await this.disconnect()
	}

    public async connect(): Promise<void>
    {
		this.peripheral.once('connect',     this.onConnect.bind(this))
		this.peripheral.once('disconnect',  this.onDisconnect.bind(this))

		return new Promise((resolve, reject) => {
			this.connectedPromiseResolution = resolve

			console.log('CONNECTING TO SENSOR')

			this.stateChecker = setInterval(() => {

				if(this.state != this.peripheral.state)
					this.onStateChange(this.peripheral.state as STATE)
	
				this.state = this.peripheral.state as STATE
	
			}, 10)

			this.peripheral.connect((error) => {
				if(error) reject(error)
			})
		})
	}

	private onConnect()
	{
		console.log('SENSOR IS CONNECTED')

		if(this.connectedPromiseResolution)
			this.connectedPromiseResolution()

		delete this.connectedPromiseResolution
	}

	public getServices(): Array<Noble.Service>
	{
		return this.services
	}

    public async disconnect(): Promise<void>
    {
		return new Promise((resovle, reject) => {
			this.disconnectPromiseResolution = resovle

			this.peripheral.disconnect()
			this.peripheral.removeAllListeners()
		})
	}

	public async fetchServicesAndCharacteristics(): Promise<void>
	{
		return new Promise((resolve, reject) => {
			this.peripheral.discoverAllServicesAndCharacteristics(
			(
				error: string,
				services: Noble.Service[],
				characteristics: Noble.Characteristic[]
			) => {
				if(error) return reject(error)

				this.services = services
				this.characteristics = characteristics

				resolve()
			})
		})
	}

	public async getCharacteristic(uuid: CHAR): Promise<Noble.Characteristic>
	{
		return new Promise((resolve, reject) => {
			this.peripheral.discoverSomeServicesAndCharacteristics([], [uuid],
			(
				error: string,
				services: Noble.Service[],
				characteristics: Noble.Characteristic[]
			) => {
				if(error) return reject(error)


				resolve(characteristics[0])
			})
		})
	}

	public getCharacteristics()
	{
		return this.characteristics
	}

    private onDisconnect()
    {
		clearInterval(this.stateChecker)
		
		if(this.disconnectPromiseResolution)
			this.disconnectPromiseResolution()

		delete this.disconnectPromiseResolution
	}

	private onStateChange(state: STATE)
	{
		if(this.peripheral.state == STATE.DISCONNECTED) this.onDisconnect()

		console.log('SENSOR STATE CHANGED', `(${state})`)		
	}

	public getServiceData(): { uuid: string; data: Buffer; }[]
	{
		const { serviceData } = this.peripheral.advertisement

		return serviceData
	}

	public wasTriggerBy(trigger: TRIGGER): boolean
	{
		return (trigger == this.getTrigger())
	}

	public getTrigger(): string
	{
		const serviceData = this.getServiceData()

		if(serviceData.length < 1) return null

		const trigger = serviceData[0].uuid.trim() //LEGACY. SHOULD BE REMOVED FOR PRODUCTION

		if(Object.values(TRIGGER).includes(trigger)) //LEGACY. SHOULD BE REMOVED FOR PRODUCTION
			return trigger

		return serviceData[0].data.toString('utf8').trim() as TRIGGER
	}

	public async readCharacteristic(uuid: CHAR): Promise<Buffer>
	{
		return new Promise(async (resolve, reject) => {

			const characteristic = await this.getCharacteristic(uuid)
			if(!characteristic) return reject('No characteristic with that UUID found')

			characteristic.read((error: string, data: Buffer) => {
				if(error) return reject(error)

				resolve(data)
			})
		})
	}

	public async writeValue(value: number, uuid: CHAR): Promise<void>
	{
		return new Promise(async (resolve, reject) => {

			// const characteristic = await this.getCharacteristic(uuid)
			// if(!characteristic) return reject('No characteristic with that UUID found')
			
			// const buffer = Buffer.from([value])

			// characteristic.write(buffer, false, (error) => {
			// 	if(error) return reject(error)

				resolve()
			// })
		})
	}

	public getRssi()
	{
		return this.rssi
	}

	public getId()
	{
		return this.id	
	}
}