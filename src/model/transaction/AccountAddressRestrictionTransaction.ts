/*
 * Copyright 2019 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Convert, RawAddress } from '../../core/format';
import { Builder } from '../../infrastructure/builders/AccountRestrictionsAddressTransaction';
import {VerifiableTransaction} from '../../infrastructure/builders/VerifiableTransaction';
import { AccountAddressRestrictionModificationBuilder } from '../../infrastructure/catbuffer/AccountAddressRestrictionModificationBuilder';
import { AccountAddressRestrictionTransactionBuilder } from '../../infrastructure/catbuffer/AccountAddressRestrictionTransactionBuilder';
import { AmountDto } from '../../infrastructure/catbuffer/AmountDto';
import { EmbeddedAccountAddressRestrictionTransactionBuilder } from '../../infrastructure/catbuffer/EmbeddedAccountAddressRestrictionTransactionBuilder';
import { EntityTypeDto } from '../../infrastructure/catbuffer/EntityTypeDto';
import { KeyDto } from '../../infrastructure/catbuffer/KeyDto';
import { SignatureDto } from '../../infrastructure/catbuffer/SignatureDto';
import { TimestampDto } from '../../infrastructure/catbuffer/TimestampDto';
import { UnresolvedAddressDto } from '../../infrastructure/catbuffer/UnresolvedAddressDto';
import { PublicAccount } from '../account/PublicAccount';
import { RestrictionType } from '../account/RestrictionType';
import { NetworkType } from '../blockchain/NetworkType';
import { UInt64 } from '../UInt64';
import { AccountRestrictionModification } from './AccountRestrictionModification';
import { Deadline } from './Deadline';
import { Transaction } from './Transaction';
import { TransactionInfo } from './TransactionInfo';
import { TransactionType } from './TransactionType';
import { TransactionVersion } from './TransactionVersion';

export class AccountAddressRestrictionTransaction extends Transaction {

    /**
     * Create a modify account address restriction transaction object
     * @param deadline - The deadline to include the transaction.
     * @param restrictionType - The account restriction type.
     * @param modifications - The array of modifications.
     * @param networkType - The network type.
     * @param maxFee - (Optional) Max fee defined by the sender
     * @returns {AccountAddressRestrictionTransaction}
     */
    public static create(deadline: Deadline,
                         restrictionType: RestrictionType,
                         modifications: Array<AccountRestrictionModification<string>>,
                         networkType: NetworkType,
                         maxFee: UInt64 = new UInt64([0, 0])): AccountAddressRestrictionTransaction {
        return new AccountAddressRestrictionTransaction(networkType,
            TransactionVersion.ACCOUNT_RESTRICTION_ADDRESS,
            deadline,
            maxFee,
            restrictionType,
            modifications);
    }

    /**
     * @param networkType
     * @param version
     * @param deadline
     * @param maxFee
     * @param restrictionType
     * @param modifications
     * @param signature
     * @param signer
     * @param transactionInfo
     */
    constructor(networkType: NetworkType,
                version: number,
                deadline: Deadline,
                maxFee: UInt64,
                public readonly restrictionType: RestrictionType,
                public readonly modifications: Array<AccountRestrictionModification<string>>,
                signature?: string,
                signer?: PublicAccount,
                transactionInfo?: TransactionInfo) {
        super(TransactionType.ACCOUNT_RESTRICTION_ADDRESS,
              networkType, version, deadline, maxFee, signature, signer, transactionInfo);
    }

    /**
     * @override Transaction.size()
     * @description get the byte size of a AccountAddressRestrictionTransaction
     * @returns {number}
     * @memberof AccountAddressRestrictionTransaction
     */
    public get size(): number {
        const byteSize = super.size;

        // set static byte size fields
        const byteRestrictionType = 1;
        const byteModificationCount = 1;

        // each modification contains :
        // - 1 byte for modificationType
        // - 25 bytes for the modification value (address)
        const byteModifications = 26 * this.modifications.length;

        return byteSize + byteRestrictionType + byteModificationCount + byteModifications;
    }

    /**
     * @internal
     * @returns {VerifiableTransaction}
     */
    protected buildTransaction(): VerifiableTransaction {
        return new Builder()
            .addDeadline(this.deadline.toDTO())
            .addFee(this.maxFee.toDTO())
            .addVersion(this.versionToDTO())
            .addRestrictionType(this.restrictionType)
            .addModifications(this.modifications.map((modification) => modification.toDTO()))
            .build();
    }

    /**
     * @internal
     * @returns {Uint8Array}
     */
    protected generateBytes(): Uint8Array {
        const signerBuffer = new Uint8Array(32);
        const signatureBuffer = new Uint8Array(64);

        const transactionBuilder = new AccountAddressRestrictionTransactionBuilder(
            new SignatureDto(signatureBuffer),
            new KeyDto(signerBuffer),
            this.versionToDTO(),
            TransactionType.ACCOUNT_RESTRICTION_ADDRESS.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            this.restrictionType.valueOf(),
            this.modifications.map((modification) => {
                return new AccountAddressRestrictionModificationBuilder(
                    modification.modificationType.valueOf(),
                    new UnresolvedAddressDto(RawAddress.stringToAddress(modification.value)),
                );
            }),
        );
        return transactionBuilder.serialize();
    }

    /**
     * @internal
     * @returns {Uint8Array}
     */
    protected generateEmbeddedBytes(): Uint8Array {
        const transactionBuilder = new EmbeddedAccountAddressRestrictionTransactionBuilder(
            new KeyDto(Convert.hexToUint8(this.signer!.publicKey)),
            this.versionToDTO(),
            TransactionType.ACCOUNT_RESTRICTION_ADDRESS.valueOf(),
            this.restrictionType.valueOf(),
            this.modifications.map((modification) => {
                return new AccountAddressRestrictionModificationBuilder(
                    modification.modificationType.valueOf(),
                    new UnresolvedAddressDto(RawAddress.stringToAddress(modification.value)),
                );
            }),
        );
        return transactionBuilder.serialize();
    }
}
