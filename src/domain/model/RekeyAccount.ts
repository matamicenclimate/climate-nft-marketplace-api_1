import { RekeyAccountRecord } from '@common/lib/api/entities'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'

@Entity()
export default class RekeyAccountEntity implements RekeyAccountRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  assetUrl?: string
  
  @Column()
  cause: string

  @Column()
  rekeyWallet: string

  @Column()
  marketplaceWallet: string

  @Column()
  assetId: number

  @Column()
  applicationId: number

  @Column()
  isClosedAuction: boolean

  @Column()
  auctionStartDate: string

  @Column()
  auctionEndDate: string

  @Column()
  type?: 'create-auction' | 'direct-listing'

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @DeleteDateColumn()
  deletedAt?: Date;
}