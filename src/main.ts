import BaseStation from "./BaseStation";
import PubSub from "./lib/PubSub";
import Websocket from "./lib/Websocket";
import BluetoothImpl from "./lib/Bluetooth";

console.log('Oh hi Main')

const baseStation = new BaseStation(new PubSub(), new Websocket, new BluetoothImpl())

baseStation.initialize()

process
.on('unhandledRejection', (reason: string, promise: Promise<any>) => {
    console.log('')
    console.log('**********************************************')
    console.log('')
    console.error('Unhandled Rejection of Promise')
    console.error(reason)
    console.error(promise)
    console.log('')
    console.log('**********************************************')
    console.log('')
})
.on('uncaughtException', (error: Error) => {
    console.log('')
    console.log('**********************************************')
    console.log('')
    console.error('Uncaught Exception thrown')
    console.error(error.message)
    console.error(error)
    console.log('')
    console.log('**********************************************')
    console.log('')
})