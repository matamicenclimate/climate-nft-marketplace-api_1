import { Get, JsonController, Param, QueryParam } from 'routing-controllers'
import { Inject, Service } from 'typedi'
import ListingService from '../services/ListingService'
import ServiceException from '../infrastructure/errors/ServiceException'
import CustomLogger from '../infrastructure/CustomLogger'
import config from '../config/default'
import { Response } from '@common/lib/api'
import { core } from '@common/lib/api/endpoints'
import { AssetNormalized } from 'src/interfaces'

// ONLY DEV - Prints swagger json
// import { getMetadataArgsStorage } from 'routing-controllers'
// import { routingControllersToSpec } from 'routing-controllers-openapi'
// import util from 'util'

@Service()
@JsonController('/api')
export default class ListingsController {
  @Inject()
  readonly ListingService: ListingService
  @Inject()
  private readonly logger!: CustomLogger

  @Get(`/${config.version}/nfts`)
  async listing(): Promise<Response<core['get']['nfts']>> {
    try {
      const assets: AssetNormalized[] = []
      for await (const result of this.ListingService.list()) {
        for (const asset of result) {
          assets.push(asset)
        }
      }
      return assets
    } catch (error) {
      const message = `Listing error: ${error.message}`
      this.logger.error(message, { stack: error.stack })
      throw new ServiceException(message)
    }
  }

  @Get(`/${config.version}/asset/:id`)
  async getAsset(
    @Param('id') id: number
  ): Promise<Response<core['get']['asset/:id']>> {
    try {
      const result = await this.ListingService.getAsset(id)
      if (result.isDefined()) {
        return result
      }

      throw new ServiceException(`Asset ${id} not found`)
    } catch (error) {
      const message = `Get asset error: ${error.message}`
      this.logger.error(message, { stack: error.stack })
      throw new ServiceException(message)
    }
  }

  @Get(`/${config.version}/assets`)
  async getAssetsFromWallet(
    @QueryParam('wallet') wallet?: string
  ): Promise<Response<core['get']['assets']>> {
    try {
      return await this.ListingService.getAssetsFromWallet(wallet)
    } catch (error) {
      const message = `Get assets from wallet error: ${error.message}`
      this.logger.error(message, { stack: error.stack })
      throw new ServiceException(message)
    }
  }
}

// ONLY DEV - Prints swagger json
// const storage = getMetadataArgsStorage()
// const spec = routingControllersToSpec(storage)
// console.log(util.inspect(spec, false, null, true /* enable colors */))
