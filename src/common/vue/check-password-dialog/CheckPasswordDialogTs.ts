import {mapState} from "vuex"
import {Message} from "@/config/index.ts"
import {TransactionType, Password} from "nem2-sdk"
import {Component, Vue, Prop, Watch} from 'vue-property-decorator'
import {getAbsoluteMosaicAmount} from "@/core/utils/mosaics"
import {AppLock} from "@/core/utils/appLock"
import {AppAccounts, AppWallet, StoreAccount} from "@/core/model"

@Component({
    computed: {...mapState({activeAccount: 'account'})},
})
export class CheckPasswordDialogTs extends Vue {
    stepIndex = 0
    show = false
    activeAccount: StoreAccount
    walletInputInfo = {
        password: ''
    }

    @Prop()
    showCheckPWDialog: boolean

    @Prop({default: ''})
    transactionDetail: any

    @Prop({default: false})
    isOnlyCheckPassword: boolean

    @Prop({
        default: () => {
            return []
        }
    })
    transactionList: Array<any>

    @Prop({
        default: () => {
            return {}
        }
    })
    otherDetails

    get node() {
        return this.activeAccount.node
    }

    get wallet() {
        return this.activeAccount.wallet
    }

    get networkType() {
        return this.activeAccount.wallet.networkType
    }

    get generationHash() {
        return this.activeAccount.generationHash
    }

    get accountName() {
        return this.activeAccount.accountName
    }

    get networkCurrency() {
        return this.activeAccount.networkCurrency
    }

    checkPasswordDialogCancel() {
        this.$emit('closeCheckPWDialog')
    }

    checkWalletPassword() {
        try {
            const isPasswordWalid = new AppWallet(this.wallet).checkPassword(new Password(this.walletInputInfo.password))
            this.show = false
            this.$emit('checkEnd', Boolean(isPasswordWalid))
            this.switchAnnounceType()
            this.checkPasswordDialogCancel()
        } catch (e) {
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
        }
    }

    checkAccountPassword() {
        const {accountName} = this
        const {password} = this.walletInputInfo
        const appAccount = AppAccounts()
        const account = appAccount.getAccountFromLocalStorage(accountName)
        try {
            const accountPassword = AppLock.decryptString(account.password, password)

            if (accountPassword === password) {
                this.$emit('checkEnd', password)
                this.showNotice()
                return
            }
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
            this.$emit('checkEnd', false)
        } catch (e) {
            this.$Notice.destroy()
            this.$Notice.error({
                title: this.$t(Message.WRONG_PASSWORD_ERROR) + ''
            })
            this.$emit('checkEnd', false)
        }

    }

    checkPassword() {
        if (this.isOnlyCheckPassword) {
            this.checkAccountPassword()
            return
        }
        this.checkWalletPassword()
    }


    // @VEEVALIDATE: watch not needed, use showCheckPWDialog as v-model
    @Watch('showCheckPWDialog')
    onShowCheckPWDialogChange() {
        this.walletInputInfo.password = ''
        this.show = this.showCheckPWDialog
    }

    switchAnnounceType() {
        const {node, generationHash, transactionList} = this
        const password = new Password(this.walletInputInfo.password)
        let {lockFee} = this.otherDetails
        if (transactionList[0].type !== TransactionType.AGGREGATE_BONDED) {
            // normal transaction
            new AppWallet(this.wallet).signAndAnnounceNormal(password, node, generationHash, transactionList, this)
            return
        }
        // bonded transaction
        new AppWallet(this.wallet).signAndAnnounceBonded( password,
                                                          lockFee,
                                                          transactionList,
                                                          this.$store
        )
    }

    showNotice() {
        this.$Notice.success({
            title: this.$t(Message.SUCCESS) + ''
        })
    }
}