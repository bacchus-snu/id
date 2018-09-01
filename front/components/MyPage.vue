<template>
  <div>
    <h1 class="welcome">{{ welcomeTrans }}</h1>
    <el-row>
      <el-col :md="{span: 8, offset: 4}" :sm="{span: 24, offset: 0}" :xs="{span: 24, offset: 0}">
        <el-card class="account">
          <div slot="header" class="card-head">
            <span>{{ passwordTrans[lang] }}</span>
          </div>
          <template v-if="!isEmailSent">
            <h2>{{ pwdChangeTrans[lang] }}</h2>
            <h3>{{ sendLinkTrans[lang] }}</h3>
            <el-form @submit.native.prevent="submitEmail">
              <el-form-item prop="email">
              <el-select v-model="selectedEmail" placeholder="Please select your email">
                <el-option v-for="email in emailList" :label="concatEmail(email)" :value="email" :key="concatEmail(email)">{{ concatEmail(email) }}</el-option>
              </el-select>
              </el-form-item>
            </el-form>
            <el-button :disabled="isEmailSendRequested" class="button" type="warning" @click="submitEmail">{{ sendTrans[lang] }}</el-button>
          </template>
          <template v-else>
            <h2>{{ sentEmailSuccessfulTrans[lang] }}</h2>
          </template>
        </el-card>
      </el-col>
      <el-col :md="8" :sm="24" :xs="24">
        <el-card class="account">
          <div slot="header" class="card-head">
            <span>{{ shellTrans[lang] }}</span>
          </div>
          <h2>{{ shellChangeTrans[lang] }}</h2>
          <h2>{{ chooseShellTrans[lang] }}</h2>
          <el-form @submit.native.prevent="submitShell">
            <el-form-item prop="shell">
            <el-select v-model="selectedShell" placeholder="Please select your shell">
              <el-option v-for="shell in shellList" :value="shell" :key="shell">{{ shell }}</el-option>
            </el-select>
            </el-form-item>
          </el-form>
          <el-button :disabled="isShellChangeRequested" class="button" type="warning" @click="submitShell">{{ changeTrans[lang] }}</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Provide, Watch } from 'nuxt-property-decorator'
import axios from 'axios'
import { Translation, Language } from '../types/translation'
import { EmailAddress } from '../types/user'

@Component({})
export default class MyPage extends Vue {
  private shellList: Array<string> = []
  private emailList: Array<EmailAddress> = []

  private isEmailSendRequested: boolean = false
  private isShellChangeRequested: boolean = false
  private isEmailSent: boolean = false
  private isShellChanged: boolean = false
  private selectedEmail: EmailAddress | null = null
  private selectedShell: string = ''

  get welcomeTrans() {
    if (this.lang === 'ko') {
      return `${this.username}님, 환영합니다.`
    } else {
      return `Welcome, ${this.username}.`
    }
  }
  private readonly passwordTrans: Translation = {
    ko: '비밀번호 변경',
    en: 'Change password',
  }
  private readonly pwdChangeTrans: Translation = {
    ko: '등록된 이메일 중 하나를 선택해주세요.',
    en: 'Please select one of your registered emails.',
  }
  private readonly sendLinkTrans: Translation = {
    ko: '비밀번호 변경 안내 이메일을 보내드리겠습니다.',
    en: 'We will send you a link to change your password.',
  }
  private readonly shellTrans: Translation = {
    ko: '셸 변경',
    en: 'Change shell',
  }
  private readonly shellChangeTrans: Translation = {
    ko: '아래에서 셸을 변경할 수 있습니다.',
    en: 'You can change your shell below.',
  }
  private readonly chooseShellTrans: Translation = {
    ko: '셸을 선택해주세요.',
    en: 'Please select the shell.',
  }
  private readonly sendTrans: Translation = {
    ko: '메일 전송',
    en: 'Send an e-mail',
  }
  private readonly changeTrans: Translation = {
    ko: '셸 변경',
    en: 'Change shell',
  }
  private readonly failShellChangeTrans: Translation = {
    ko: '셸 변경에 실패하였습니다.',
    en: 'Failed to change shell.',
  }
  private readonly failPasswordChangeEmailTrans: Translation = {
    ko: '비밀번호 재설정 이메일을 보내는 데에 실패하였습니다.',
    en: 'Failed to send password change email.',
  }
  private readonly sentEmailSuccessfulTrans: Translation = {
    ko: '비밀번호 재설정 링크가 메일로 전송되었습니다.',
    en: 'Password reset email was sent successfully.',
  }
  private readonly successShellChangeTrans: Translation = {
    ko: '성공적으로 셸이 변경되었습니다.',
    en: 'Your shell was successfully changed.',
  }

  get lang(): Language {
    return this.$store.state.language
  }

  get username(): string {
    return this.$store.state.username
  }

  private async mounted() {
    const response = await axios.get('/api/check-login', {
      validateStatus: () => true,
    })

    if (response.status === 200 && response.data.username) {
      this.$store.commit('changeUsername', response.data.username)
    } else {
      this.$router.push('/')
    }

    const shellResponse = await axios.get('/api/shells', {
      validateStatus: () => true,
    })
    const emailResponse = await axios.get('/api/user/emails',
      { validateStatus: () => true })

    this.shellList = shellResponse.data.shells
    this.emailList = emailResponse.data.emails
  }

  private async submitEmail() {
    this.isEmailSendRequested = true
    await this.sendEmail()
    this.isEmailSendRequested = false
  }

  private async sendEmail() {
    if (this.selectedEmail === null) {
      return
    }
    const response = await axios.post('/api/user/send-password-token', {
      emailLocal: this.selectedEmail.local,
      emailDomain: this.selectedEmail.domain,
    }, { validateStatus: () => true })

    if (response.status !== 200) {
      this.$notify.error(this.failPasswordChangeEmailTrans[this.lang])
      return
    }

    this.isEmailSent = true
  }

  private async submitShell() {
    if (!this.selectedShell) {
      return
    }

    this.isShellChangeRequested = true
    await this.changeShell()
    this.isShellChangeRequested = false
  }

  private async changeShell() {
    const response = await axios.post('/api/user/shell', {
      shell: this.selectedShell,
    }, { validateStatus: () => true })

    if (response.status !== 200) {
      this.$notify.error(this.failShellChangeTrans[this.lang])
      return
    }

    this.$notify.success(this.successShellChangeTrans[this.lang])
  }

  private concatEmail(email: EmailAddress): string {
    return `${email.local}@${email.domain}`
  }
}
</script>

<style scoped>
.my-page {
  text-align: center;
  background-color: yellow;
}

.welcome {
  font-size: 32px;
  font-weight: 500;
  line-height: 40px;
  text-align: center;
  margin-top: 4%;
}

.account {
  margin-top: 8%;
  text-align: center;
  vertical-align: middle;
  margin-right: 20px;
  margin-left: 20px;
}

.button {
  margin-top: 50px;
  width: 80%;
  height: 40px;
  padding: 3px;
  background-color: white;
  border: 2px solid #f2a43e;
  color: black;
  font-size: 16px;
}

.button:hover {
  background-color: #f2a43e;
}

.el-select {
  width: 80%;
  margin: 10px;
}

.card-head {
  font-size: 24px;
}
</style>
