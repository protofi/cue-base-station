import * as Noble from 'noble'

export default class Sensor {
    public readonly id: string

    private peripheral: Noble.Peripheral
    private characteristics: Array<Noble.Characteristic>
	private services: Array<Noble.Service>
	
	private disconnectCallback: () => void
	private connectCallback: () => void

    constructor(peripheral: Noble.Peripheral)
    {
        this.peripheral = peripheral
        this.id = peripheral.id

        this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))
    }

    public connect(connectCallback?: () => void, disconnectCallback?: () => void): void
    {
		this.disconnectCallback = (disconnectCallback) ? disconnectCallback : null
		this.connectCallback 	= (connectCallback) ? connectCallback : null
		
		console.log('CONNECT SENSOR')
    	this.peripheral.connect(error => console.log)
    }

	private onConnect(keepConnectionAlive: boolean)
	{

        console.log('SENSOR IS CONNECTED')

		if(this.connectCallback)
			this.connectCallback()

			// if(this.currentDeviceFoundCB) this.currentDeviceFoundCB(this.currentPeripheral)

		this.peripheral.discoverAllServicesAndCharacteristics((error: string, services: Noble.Service[], chararacteristics: Noble.Characteristic[]) => {
            if(error)
				console.log("There was an error discovering services: ", error)
			else
			{
				this.characteristics = chararacteristics
				this.services = services				

				this.disconnect()
			}
		})
	}

    public disconnect()
    {
		console.log('DISCONNECT')
		this.peripheral.disconnect()
    }

    private onDisconnect()
    {
        console.log('SENSOR IS DISCONNECTED')
	
		if(this.disconnectCallback)
			this.disconnectCallback()
	}
}