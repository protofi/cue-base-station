import * as Noble from 'noble'

export default class Sensor {
    public readonly id: string

    private peripheral: Noble.Peripheral
    private characteristics: Array<Noble.Characteristic>
    private services: Array<Noble.Service>

    constructor(peripheral: Noble.Peripheral)
    {
		console.log('SENSOR CONTRUCTED')
		
        this.peripheral = peripheral
        this.id = peripheral.id

        this.peripheral.once("connect",     this.onConnect.bind(this))
		this.peripheral.once("disconnect",  this.onDisconnect.bind(this))
    }

    public connect(): void
    {
    		this.peripheral.connect(error => console.log)
    }

    private onConnect(keepConnectionAlive: boolean) {
        if(!this.peripheral) return

        console.log('SENSOR IS CONNECTED')

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
		if(!this.peripheral) return
        this.peripheral.disconnect()
    }

    private onDisconnect()
    {
        console.log('SENSOR IS DISCONNECTED')
	}
}