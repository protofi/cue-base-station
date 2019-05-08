import * as Noble from 'noble'

export default class Bluetooth {

    private stateChangeActions: Map<string, () => void> = new Map()

    contructor()
    {
        this.mountHooks()
    }

    public scan(scanFilter?: any, cb?: any, once?: boolean): void
    {
        Noble.startScanning([], true) // any service UUID, duplicates allowed
    }

    private mountHooks()
    {
        Noble.on("stateChange", (state: string) => {
            console.log('STATE CHANGE:', state)
            const action = this.stateChangeActions.get(state)
            if(action) action()
        })

        Noble.on("discover", (peripheral: Noble.Peripheral) => {

        })

        Noble.on("scanStart", (scan: string) => {
            console.log('SCANNING STARTED', scan)
        })

        Noble.on("scanStop", (scan: string) => {
            console.log('SCANNING STOPPED', scan)
        })
    }

    public poweredOn(cb: () => void): any {
        this.stateChangeActions.set("poweredOn", cb)
    }
}