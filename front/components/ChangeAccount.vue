<template>
  <div>
    <h1 class="welcome">{{ welcomeTrans[lang] }}</h1>
    <el-row type="flex" justify="center">
      <el-col :span="8">
        <el-card class="account">
          <div slot="header" class="card-head">
          <span>{{ passwordTrans[lang] }}</span>
          </div>
          <h2>{{ pwdChangeTrans[lang] }}</h2>
          <h3>{{ sendLinkTrans[lang] }}</h3>
          <el-form @submit.native.prevent="submitEmail">
            <el-form-item prop="email">
            <el-select v-model="selectedEmail" placeholder="Please select your email">
              <el-option v-for="email in emailList" :label="concatEmail(email)" :value="email" :key="concatEmail(email)">{{ concatEmail(email) }}</el-option>
            </el-select>
            </el-form-item>
          </el-form>
          <el-button :disabled="isSubmitted" class="button" type="warning" @click="submitEmail">{{ sendTrans[lang] }}</el-button>
        </el-card>
      </el-col>
      <el-col :span="8" :offset="1">
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
          <el-button :disabled="isRequested" class="button" type="warning" @click="submitShell">{{ changeTrans[lang] }}</el-button>
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
export default class ChangeAccount extends Vue {
  @Prop()
  private readonly shellList: Array<string>
  @Prop()
  private readonly emailList: Array<EmailAddress>

  private isSubmitted: boolean = false
  private isRequested: boolean = false
  private isEmailSent: boolean = false
  private isShellChanged: boolean = false
  private selectedEmail: EmailAddress = { local: '', domain: '' }
  private selectedShell: string = ''

  private readonly welcomeTrans: Translation = {
    ko: this.username + '님, 환영합니다.',
    en: 'Welcome, ' + this.username + '.',
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

  get lang(): Language {
    return this.$store.state.language
  }

  get username(): string {
    return this.$store.state.username
  }

  public async submitEmail() {
    this.isSubmitted = true
    await this.sendEmail()
  }

  public async sendEmail() {
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

  public async submitShell() {
    if (!this.selectedShell) {
      return
    }

    this.isRequested = true
    await this.changeShell()
    this.isRequested = false
  }

  public async changeShell() {
    const response = await axios.post('/api/user/shell', {
      shell: this.selectedShell,
    }, { validateStatus: () => true })

    if (response.status !== 200) {
      this.$notify.error(this.failShellChangeTrans[this.lang])
      return
    }

    this.isShellChanged = true
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
  height: 380px;
  vertical-align: middle;
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
