import * as fs from 'fs'
import * as mqtt from 'mqtt' 
import * as jwt from 'jsonwebtoken'

export enum Topics {
    INITIALIZE          = "initialize",
    NEW_SENSOR          = "new-sensor",
    NOTIFICATION        = "notification",
    UPDATE_WEBSOCKET    = "update-websocket",
    HEARTBEAT           = "heartbeat",
    CALIBRATION         = "calibration",
}

export enum Errors {
    NOT_AUTHORIZED = 'Not authorized',
    BAD_USER_PASS = 'Bad username or password'

}
export default class PubSub {
   
    private privateKeyFile: string      = './data/rsa-priv.pem'

    private mqttBridgeHostname: string  = 'mqtt.googleapis.com'
    private mqttBridgePort: string      = '8883'
    private tokenExpMins: number        = 20
    private numMessages: string         = '10'
    private messageType: string         = 'events'
    private algorithm: string           = 'RS256'

    private deviceUUID: string 
    private cloudRegion: string         = process.env.GOOGLE_IOT_REGION
    private registryId: string          = process.env.GOOGLE_IOT_REGISTRY
    private projectId: string           = process.env.GOOGLE_IOT_PROJECT

    private iatTime: number
    private expTime: number
    private client: mqtt.MqttClient

	private connectedPromiseResolution:     (value?: void | PromiseLike<void>) => void
	private connectedPromiseRejection:      (reason?: any) => void

    private errorCallback: (error: Error) => void = console.log

    constructor(privateKeyFile?: string) {
        this.privateKeyFile = (privateKeyFile) ? privateKeyFile : this.privateKeyFile
    }

    private mountHooks()
    {
        this.client.on('connect', (success: any) => {
            console.log('PUBSUB CONNECTED')
            this.connected(success)
        })

        this.client.on('close', () => {
            console.log('PUBSUB CLOSED')
        })

        this.client.on('error', (error: Error) => {
            
            if(error.message.includes(Errors.BAD_USER_PASS) || error.message.includes(Errors.BAD_USER_PASS))
            {
                console.log('RE-AUTH')
                this.connect()
                return
            }

            this.connectedPromiseRejection(error)
            this.errorCallback(error)
        })

        // this.client.on('message', (topic, message: string, packet) => {
        //     console.log('message received: ', Buffer.from(message, 'base64').toString('ascii'))
        // })
    }

    // Create a Cloud IoT Core JWT for the given project id, signed with the given private key.
    private createJwt(projectId: string, privateKeyFile: string, algorithm: string): string
    {
        // Create a JWT to authenticate this device. The device will be disconnected
        // after the token expires, and will have to reconnect with a new token. The
        // audience field should always be set to the GCP project id.
        this.iatTime = parseInt(String(Date.now() / 1000))
        this.expTime = parseInt(String(Date.now() / 1000)) + this.tokenExpMins * 60 // 20 minutes

        const token = {
            'iat' : this.iatTime,
            'exp' : this.expTime,
            'aud' : projectId
        }

        const privateKey = fs.readFileSync(privateKeyFile)
        return jwt.sign(token, privateKey, {algorithm: algorithm})
    }

    public setDeviceUUID(deviceUUID: string): void
    {
        this.deviceUUID = deviceUUID
    }

    private checkAuth() : void
    {
        let secsFromIssue = parseInt(String(Date.now() / 1000)) - this.iatTime;

        if (secsFromIssue <= this.expTime - this.iatTime) return

        console.log('RE-AUTH')

        //reconnect
        this.connect()
    }

    public connect() : Promise<void>
    {
        return new Promise((resolve, reject) => {

            this.connectedPromiseResolution = resolve
            this.connectedPromiseRejection = reject

            const mqttClientId = `projects/${this.projectId}/locations/${this.cloudRegion}/registries/${this.registryId}/devices/${this.deviceUUID}`

            let connectionArgs = {
                host: this.mqttBridgeHostname,
                port: this.mqttBridgePort,
                clientId: mqttClientId,
                username: 'unused',
                password: this.createJwt(this.projectId, this.privateKeyFile, this.algorithm),
                protocol: 'mqtts',
                secureProtocol: 'TLSv1_2_method'
            }
    
            if(this.client) this.client.end() //close previous connection if it exist
    
            this.client = mqtt.connect(connectionArgs)
    
            this.mountHooks()
        })
    }

    private connected(success: any)
    {
        if (!success)
        {
            console.log('Client not connected...')
            return this.connectedPromiseRejection()
        }

        this.connectedPromiseResolution()
    }

    public publish(topic: string, payload: {} = {}): Promise<void>
    {
        this.checkAuth()

        console.log('PUBSUB PUBLISHED', payload, 'to', topic)

        const payloadString = JSON.stringify(payload)

        const mqttTopic = `/devices/${this.deviceUUID}/${this.messageType}/${topic}`

        return new Promise((resolve, reject) => {
            this.client.publish(
                mqttTopic,
                payloadString, {
                    qos: 1 //At least once
                }, (error, packet) => {
                    if(error) return reject()
                    resolve()
                })
        })

    }

    public onError(cb: (error: Error) => void): void {
        this.errorCallback = cb
    }
}