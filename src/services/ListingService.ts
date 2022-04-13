import { Inject, Service } from 'typedi'
const axios = require('axios').default
import config from '../config/default'
import algosdk from 'algosdk'
import CustomLogger from '../infrastructure/CustomLogger'
import {
  Asset,
  AssetNormalized,
  PopulatedAsset,
  Transaction,
} from 'src/interfaces'
import { none, some, option } from '@octantis/option'
import { AxiosError, AxiosPromise, AxiosResponse } from 'axios'
import ServiceException from 'src/infrastructure/errors/ServiceException'

@Service()
export default class ListingService {
  @Inject()
  private readonly logger!: CustomLogger

  async listing() {
    const assets = await this.getAssets()
    const assetsPopulated = await this.getPopulatedAssets(assets)
    return this.getNormalizedAssets(assetsPopulated)
  }

  async getPopulatedAssets(assets: Asset[]) {
    let counter = 0
    let promises = []
    const assetsPopulated: PopulatedAsset[] = []
    if (!Array.isArray(assets)) return assetsPopulated
    while (counter < assets.length) {
      promises.push(this.populateAsset(assets[counter]['asset-id']))
      if (counter === assets.length - 1 || promises.length > 5) {
        const result = await Promise.all(promises)
        assetsPopulated.push(...result)
        promises = []
      }
      counter++
    }
    return assetsPopulated
  }

  getNormalizedAssets(assetsPopulated: PopulatedAsset[]) {
    const assetsNormalized = []
    for (const asset of assetsPopulated) {
      const assetNormalized: option<AssetNormalized> =
        this.normalizeAsset(asset)
      if (assetNormalized.isDefined()) {
        assetsNormalized.push(assetNormalized.value)
      }
    }

    return assetsNormalized
  }

  async getAssets() {
    try {
      const { address } = config.defaultWallet
      const addressAssetsRequest = axios.get(
        `${config.algoIndexerApi}/accounts/${address}`,
        {
          headers: {
            accept: 'application/json',
            'x-api-key': config.algoClientApiKey,
          },
        }
      )
      const response = await this.retryAxiosRequest(addressAssetsRequest, 5, 1000)
      return response.data.account.assets
    } catch (error) {
      if (error.response.status === 404) return []
      throw new ServiceException(error.message, error.response.status)
    }
  }

  async populateAsset(asset: number) {
    try {
      const getTransactionsRequest = axios.get(
        `${config.algoIndexerApi}/assets/${asset}/transactions`,
        {
          headers: {
            accept: 'application/json',
            'x-api-key': config.algoClientApiKey,
          },
        }
      )
      const response = await this.retryAxiosRequest(getTransactionsRequest, 5, 1000)

      return { ...response.data, id: asset }
    } catch (error) {
      const message = 'Error on populate asset: ' + error.message
      this.logger.error(message)
      throw new ServiceException(message, error.response.status)
    }
  }

  async retryAxiosRequest(promise: AxiosPromise, retryCount: number, timeout: number): Promise<AxiosResponse> {
    try {
      return await new Promise(async (resolve, reject) => {
        setTimeout(async () => {
          reject('Timeout is reached!')
        }, timeout)
        try {
          resolve(await promise)
        } catch (e) {
          reject(e)
        }
      })
    } catch (err) {
      if (retryCount < 1) {
        throw err
      }
      return await this.retryAxiosRequest(promise, retryCount - 1, timeout)
    }
  }

  normalizeAsset(asset: PopulatedAsset): option<AssetNormalized> {
    const txn = [...asset.transactions]
      .reverse()
      .find((x: Transaction) => x.note != null)
    // console.log(
    //   'NOTES:',
    //   txns.map(
    //     s =>
    //       (algosdk.decodeObj(Buffer.from(s.note ?? '', 'base64')) as any).arc69
    //         .properties
    //   )
    // )
    if (txn && txn.note) {
      try {
        const metadata: AssetNormalized = algosdk.decodeObj(
          Buffer.from(txn.note, 'base64')
        ) as AssetNormalized
        return some({ ...metadata, id: (asset as any).id })
      } catch (error) {
        this.logger.error(error.message)
      }
    }

    return none()
  }
}
