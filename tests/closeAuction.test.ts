import 'reflect-metadata'
import { expect } from 'chai'
import request from 'supertest'
import server from './testSupport/server'
import sinon from 'sinon'
import { assetNormalized, auctionAppState, responseOptInService } from './testSupport/mocks'
import CloseAuction from 'src/services/CloseAuction'
import { TransactionOperation } from '@common/services/TransactionOperation'
import algosdk from 'algosdk'
import Container from 'typedi'
import FindListing from 'src/services/list/FindListingService'
import DbConnectionService from 'src/services/DbConnectionService'
import ListEntity from 'src/domain/model/ListEntity'
import { stubCreateAuction } from './testSupport/stubs'

afterEach(async () => {
  const connection = await DbConnectionService.create()
  await connection.createQueryBuilder().delete().from(ListEntity).execute()
  await connection.destroy()
})
describe.skip('Close Auction', () => {
  it('updates isClosedAuction field', async () => {
    const closeAuction = Container.get(CloseAuction)
    await prepareCloseAuctionStub()
    await closeAuction.execute([{applicationIdBlockchain: assetNormalized.arc69.properties.app_id} as ListEntity])
    const findListing = new FindListing()
    const rekey = await findListing.execute()
    expect(rekey[0].applicationId).to.equal(assetNormalized.arc69.properties.app_id)
    expect(rekey[0].isClosedAuction).to.be.equal(true)
  })
})

const prepareCloseAuctionStub = async () => {
  const assetId = responseOptInService.txn.txn.xaid
    stubCreateAuction(assetId)
    sinon.stub(TransactionOperation.prototype, 'getApplicationState').resolves(auctionAppState)
    sinon.stub(algosdk, 'mnemonicToSecretKey').resolves(Promise.resolve({
      account: {
          addr: 'account'
      }
    }))
    sinon.stub(algosdk.Algodv2.prototype, 'getTransactionParams').returns({
      do: () => { }
    } as any)
    sinon.stub(CloseAuction.prototype, '_deleteTransactionToCloseAuction').resolves({
      txId: 20942,
    } as { txId: number; result: Record<string, unknown>; })
    // sinon.stub(TransactionOperation.prototype, 'closeReminderTransaction').resolves({
    //   txId: 20942,
    // } as { txId: number; result: Record<string, unknown>; })
    const response = await request(server)
            .post(`/api/${process.env.RESTAPI_VERSION}/create-auction`)
            .send({
                assetId,
                creatorWallet: 'creator-wallet',
                causePercentage: '50',
                startDate: new Date().toISOString(),
                endDate: new Date('2023-04-26T08:40:58.338Z').toISOString()
            })
}