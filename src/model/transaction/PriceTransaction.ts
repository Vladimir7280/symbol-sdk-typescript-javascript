import {
    PriceTransactionBuilder,
    AmountDto,
    EmbeddedTransactionBuilder,
    EmbeddedPriceTransactionBuilder,
    TimestampDto,
    TransactionBuilder,
} from 'twix-catbuffer-typescript';
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


export class PriceTransaction extends Transaction {
    /**
     * Create a address alias transaction object
     * @param deadline - The deadline to include the transaction.
     * @param blockHeight - The block the price change was registered for.
     * @param highPrice - Highest price from the exchange since the last price transaction.
     * @param lowPrice - Lowest price from the exchange since the last price transaction.
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
         * blockHeight.
         */
        public readonly blockHeight: UInt64,
        /**
         * highPrice.
         */
        public readonly highPrice: UInt64,
        /**
         * lowPrice.
         */
        public readonly lowPrice: UInt64,
        signature?: string,
        signer?: PublicAccount,
        transactionInfo?: TransactionInfo,
    ) {
        super(TransactionType.PRICE, networkType, version, deadline, maxFee, signature, signer, transactionInfo);
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
            new UInt64((builder as PriceTransactionBuilder).getblockHeight().amount),
            new UInt64((builder as PriceTransactionBuilder).gethighPrice().amount),
            new UInt64((builder as PriceTransactionBuilder).getlowPrice().amount),
            networkType,
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as PriceTransactionBuilder).fee.amount),
            signature,
            signerPublicKey.match(`^[0]+$`) ? undefined : PublicAccount.createFromPublicKey(signerPublicKey, networkType),
        );
        return transaction;
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
            TransactionType.PRICE.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            new AmountDto(this.blockHeight.toDTO()),
            new AmountDto(this.highPrice.toDTO()),
            new AmountDto(this.lowPrice.toDTO()),
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
            TransactionType.PRICE.valueOf(),
            new AmountDto(this.blockHeight.toDTO()),
            new AmountDto(this.highPrice.toDTO()),
            new AmountDto(this.lowPrice.toDTO()),
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