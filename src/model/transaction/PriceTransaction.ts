import {
    PriceTransactionBuilder,
    AmountDto,
    EmbeddedPriceTransactionBuilder,
    EmbeddedTransactionBuilder,
    TimestampDto,
    TransactionBuilder,
} from 'catbuffer-typescript';
import { Convert } from '../../core/format';
import { DtoMapping } from '../../core/utils';
import { Address } from '../account/Address';
import { PublicAccount } from '../account/PublicAccount';
import { NetworkType } from '../network/NetworkType';
import { UInt64 } from '../UInt64';
import { Deadline } from './Deadline';
import { InnerTransaction } from './InnerTransaction';
import { Transaction } from './Transaction';
import { TransactionInfo } from './TransactionInfo';
import { TransactionType } from './TransactionType';
import { TransactionVersion } from './TransactionVersion';

/**
 * In case a mosaic has the flag 'supplyMutable' set to true, the creator of the mosaic can change the supply,
 * i.e. increase or decrease the supply.
 */
export class PriceTransaction extends Transaction {
    /**
     * Create a address alias transaction object
     * @param deadline - The deadline to include the transaction.
     * @param blockHeight - The alias action type.
     * @param highPrice - The namespace id.
     * @param lowPrice - The address.
     * @param networkType - The network type.
     * @param maxFee - (Optional) Max fee defined by the sender
     * @param signature - (Optional) Transaction signature
     * @param signer - (Optional) Signer public account
     * @returns {PriceTransaction}
     */
    public static create(
        deadline: Deadline,
        blockHeight: UInt64 = new UInt64([0, 0]),
        highPrice: UInt64 = new UInt64([0, 0]),
        lowPrice: UInt64 = new UInt64([0, 0]),
        networkType: NetworkType,
        maxFee: UInt64 = new UInt64([0, 0]),
        signature?: string,
        signer?: PublicAccount,
    ): PriceTransaction {
        return new PriceTransaction(
            networkType,
            TransactionVersion.PRICE,
            deadline,
            maxFee,
            blockHeight,
            highPrice,
            lowPrice,
            signature,
            signer,
        );
    }

    /**
     * @param networkType
     * @param version
     * @param deadline
     * @param maxFee
     * @param blockHeight
     * @param highPrice
     * @param lowPrice
     * @param signature
     * @param signer
     * @param transactionInfo
     */
    constructor(
        networkType: NetworkType,
        version: number,
        deadline: Deadline,
        maxFee: UInt64,
        /**
         * The alias action type.
         */
        public readonly blockHeight: UInt64,
        /**
         * The namespace id that will be an alias.
         */
        public readonly highPrice: UInt64,
        /**
         * The address.
         */
        public readonly lowPrice: UInt64,
        signature?: string,
        signer?: PublicAccount,
        transactionInfo?: TransactionInfo,
    ) {
        super(TransactionType.ADDRESS_ALIAS, networkType, version, deadline, maxFee, signature, signer, transactionInfo);
    }

    /**
     * Create a transaction object from payload
     * @param {string} payload Binary payload
     * @param {Boolean} isEmbedded Is embedded transaction (Default: false)
     * @returns {Transaction | InnerTransaction}
     */
    public static createFromPayload(payload: string, isEmbedded = false): Transaction | InnerTransaction {
        const builder = isEmbedded
            ? EmbeddedPriceTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload))
            : PriceTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload));
        const signerPublicKey = Convert.uint8ToHex(builder.getSignerPublicKey().publicKey);
        const networkType = builder.getNetwork().valueOf();
        const signature = Transaction.getSignatureFromPayload(payload, isEmbedded);
        const transaction = PriceTransaction.create(
            isEmbedded
                ? Deadline.createEmtpy()
                : Deadline.createFromDTO((builder as PriceTransactionBuilder).getDeadline().timestamp),
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as PriceTransactionBuilder).blockHeight),
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as PriceTransactionBuilder).highPrice),
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as PriceTransactionBuilder).lowPrice),
            networkType,
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as PriceTransactionBuilder).fee.amount),
            signature,
            signerPublicKey.match(`^[0]+$`) ? undefined : PublicAccount.createFromPublicKey(signerPublicKey, networkType),
        );
        return isEmbedded ? transaction.toAggregate(PublicAccount.createFromPublicKey(signerPublicKey, networkType)) : transaction;
    }

    /**
     * @internal
     * @returns {TransactionBuilder}
     */
    protected createBuilder(): TransactionBuilder {
        const transactionBuilder = new PriceTransactionBuilder(
            this.getSignatureAsBuilder(),
            this.getSignerAsBuilder(),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.ADDRESS_ALIAS.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            this.blockHeight.toDTO(),
            this.highPrice.toDTO(),
            this.lowPrice.toDTO(),
        );
        return transactionBuilder;
    }

    /**
     * @internal
     * @returns {EmbeddedTransactionBuilder}
     */
    public toEmbeddedTransaction(): EmbeddedTransactionBuilder {
        return new EmbeddedPriceTransactionBuilder(
            this.getSignerAsBuilder(),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.ADDRESS_ALIAS.valueOf(),
            this.blockHeight.toDTO(),
            this.highPrice.toDTO(),
            this.lowPrice.toDTO(),
        );
    }

    /**
     * @internal
     * @returns {PriceTransaction}
     */
    resolveAliases(): PriceTransaction {
        return this;
    }

    /**
     * @internal
     * Check a given address should be notified in websocket channels
     * @param address address to be notified
     * @returns {boolean}
     */
    public shouldNotifyAccount(address: Address): boolean {
        return super.isSigned(address); //|| this.address.equals(address);
    }
}