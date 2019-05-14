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

    public connect(connectCallback?: () => void, disconnectCallback?: () => void): void
    {
		this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))

		this.connectCallback 	= (connectCallback) ? connectCallback : null
		this.disconnectCallback = (disconnectCallback) ? disconnectCallback : null
		
		this.peripheral.connect((error) => {
			if(error) console.log('SENSOR CONNECT ERROR', error)
		})
	}

	private onConnect()
	{
		console.log('SENSOR IS', this.peripheral.state)
		console.log('RETRIEVING SENSOR DATA')

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
	}

    public disconnect(cb?: () => void)
    {
		this.peripheral.disconnect(cb)
		this.peripheral.removeAllListeners()
	}

    private onDisconnect()
    {
		console.log('SENSOR IS', this.peripheral.state)

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

	public getTrigger(): TRIGGER
	{
		const serviceData = this.getServiceData()

		if(serviceData.length < 1) return null

		if(Object.values(TRIGGER).includes(serviceData[0].uuid.trim())) //LEGACY. SHOULD BE REMOVED FOR PRODUCTION
			return serviceData[0].uuid.trim() as TRIGGER

		return serviceData[0].data.toString('utf8').trim() as TRIGGER
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