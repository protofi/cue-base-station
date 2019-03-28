import { expect } from 'chai'
import * as uniqid from 'uniqid'
import * as sinon from 'sinon'
import 'mocha'

import BaseStation from "./../src/BaseStation";
import PubSub, { Topics } from '../src/lib/PubSub';
import Websocket from '../src/lib/Websocket';

describe('Unit_Test', () => {

    describe('Base Station', () => {

        const baseStationUUID = uniqid()
        const UUIDPrefix = 'b'

        let baseStation: BaseStation
        
        const pubsubConnectSpy = sinon.spy()
        const pubsubPublishSpy = sinon.spy()

        const pubsub = new PubSub()
        const websocket = new Websocket()

        const pubsubStub = sinon.stub(pubsub, 'connect').get(() => {
            return pubsubConnectSpy
        })

        sinon.stub(pubsub, 'publish').get(() => {
            return pubsubPublishSpy
        })

        beforeEach(() => {

            process.env.RESIN_DEVICE_UUID = baseStationUUID
            process.env.DEVICE_UUID_PREFIX = UUIDPrefix

            baseStation = new BaseStation(pubsub, websocket)
        })

        after(() => {
            delete process.env.RESIN_DEVICE_UUID
            delete process.env.RESIN_DEVICE_UUID_PREFIX
        })

        describe('Method: Get Id', async () => {
            
            it('Should return combination if environment varialbes', async () => {
            
                const id = baseStation.getId()
    
                const expectedBaseStationId = `${UUIDPrefix}${baseStationUUID}`
    
                expect(id).to.be.equal(expectedBaseStationId)
            })
        })

        describe('Method: Initialize', async () => {

            it('Should invoke connect method on Pubsub instance', async () => {

                baseStation.initialize()
                expect(pubsubConnectSpy.called).to.be.true
            })

            it('Should passed a callback when invoking connect method', async () => {
                baseStation.initialize()

                const argOne = pubsubConnectSpy.getCall(0).args[0]

                expect(typeof argOne).to.be.equal(typeof Function)
            })

            describe('Callback', () => {

                it('Should invoke publish method on Pubsub instance', async () => {
                    baseStation.initialize()
    
                    const callback = pubsubConnectSpy.getCall(0).args[0]
    
                    callback()

                    expect(pubsubPublishSpy.called).to.be.true
                })

                it('Should invoke publish method on Pubsub instance with correct parameters', async () => {
                    baseStation.initialize()
    
                    const callback = pubsubConnectSpy.getCall(0).args[0]
    
                    callback()

                    const argOne = pubsubPublishSpy.getCall(0).args[0]
                    const argTwo = pubsubPublishSpy.getCall(0).args[1]

                    expect(argOne).to.be.equal(Topics.INITIALIZE)

                    const expectedPayload = {
                        base_station_UUID : baseStation.getId()
                    }

                    expect(argTwo).to.be.deep.equal(expectedPayload)
                })
            })

            afterEach(() => {
                pubsubConnectSpy.resetHistory()
            })
        })
    })
})