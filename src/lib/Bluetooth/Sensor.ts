import * as Noble from 'noble'

export enum TRIGGER {
	AUD 	= '4f49445541',
	BTN 	= '4e4f54545542',
	BUTTON 	= 'BUTTON',
	AUDIO 	= 'AUDIO'
}

export enum STATE {
	ERROR 			= 'error',
	CONNECTED 		= 'connected',
	CONNECTING 		= 'connecting',
	DISCONNECTED 	= 'disconnected',
	DISCONNECTING 	= 'disconnecting',
}
export default class Sensor {
	
    private id: string
	private rssi: number
	
	private state: STATE

    private peripheral: Noble.Peripheral
    private characteristics: Array<Noble.Characteristic>
	private services: Array<Noble.Service>
	private stateChecker: NodeJS.Timeout

	private disconnectCallback: () => void
	private connectCallback: () => void

	private connectedPromiseResolution: (value?: void | PromiseLike<void>) => void

    constructor(peripheral: Noble.Peripheral)
    {
        this.peripheral = peripheral
        this.id = peripheral.id
		this.rssi = peripheral.rssi
	}
	
	/**
	 * touch
	 */
	public touch(callback: () => void)
	{
		console.log('TOUCHING SENSOR')
		this.connect(this.disconnect, callback)
	}

    public async connect(connectCallback?: () => void, disconnectCallback?: () => void): Promise<void>
    {
		this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))

		// this.connectCallback 	= (connectCallback) ? connectCallback : null
		// this.disconnectCallback = (disconnectCallback) ? disconnectCallback : null
		
		// this.peripheral.connect((error) => {
		// 	if(error) console.log('SENSOR CONNECT ERROR', error)
		// })
		return new Promise((resolve, reject) => {
			this.connectedPromiseResolution = resolve

			this.peripheral.connect((error) => {
				if(error) reject(error)
			})
		})
	}

	private onConnect()
	{
		const _this = this

		this.peripheral.updateRssi((error: string, rssi: number) => {
			if(error) console.log(error)
			this.rssi = rssi
		})

		this.stateChecker = setInterval(() => {
			if(this.state != this.peripheral.state)
			{
				console.log('SENSOR STATE CHANGED', `(${this.peripheral.state})`)
				this.state = this.peripheral.state as STATE
			}

			if(this.peripheral.state == STATE.DISCONNECTED)
			{
				this.onDisconnect()
			}
		}, 10)
		
		this.peripheral.discoverAllServicesAndCharacteristics(
		(
			error: string,
			services: Noble.Service[],
			chararacteristics: Noble.Characteristic[]
		) => {

			if(error) console.log("There was an error discovering services: ", error)

			_this.characteristics = chararacteristics
			_this.services = services

			if(_this.connectCallback)
				_this.connectCallback()
		})

		if(this.connectedPromiseResolution)
			this.connectedPromiseResolution()
	}

    public disconnect()
    {
		this.peripheral.disconnect()
		this.peripheral.removeAllListeners()
	}

    private onDisconnect()
    {
		clearInterval(this.stateChecker)
		
		if(this.disconnectCallback)
			this.disconnectCallback()
	}

	public getServiceData(): { uuid: string; data: Buffer; }[]
	{
		const { serviceData } = this.peripheral.advertisement

		return serviceData
	}

	/**
	 * wasTriggerBy
	 */
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

	/**
	 * getCharacteristics
	 */
	public getCharacteristics(): Array<Noble.Characteristic>
	{
		return this.characteristics	
	}

	/**
	 * getServices
	 */
	public getServices(): Array<Noble.Service>
	{
		return this.services
	}

	/**
	 * getRssi
	 */
	public getRssi()
	{
		return this.rssi
	}

	/**
	 * getId
	 */
	public getId()
	{
		return this.id	
	}
}