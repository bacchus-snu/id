<template>
  <el-card class="find">
  <div slot="header" class="card-head">
    <span>Reset your password</span>
  </div>
  <template v-if="!isEmailSent">
    <h2>{{ emailTrans[lang] }}</h2>
    <h3>{{ sendLinkTrans[lang] }}</h3>
    <el-form @submit.native.prevent="submitForm" :model="models" status-icon ref="findForm" :rules="rules">
      <el-form-item prop="email">
        <el-input :disabled="isSubmitted" v-model="models.email" placeholder="example@snu.ac.kr"></el-input>
      </el-form-item>
    </el-form>
    <el-button :disabled="isSubmitted" class="button" type="warning" @click="submitForm">{{ sendTrans[lang] }}</el-button>
  </template>
  <template v-else>
    <h2>{{ successTrans[lang] }}</h2>
  </template>
  </el-card>
</template>

<script lang="ts">
import { Component, Vue, Provide } from 'nuxt-property-decorator'
import { Translation, Language } from '../types/translation'

@Component({})
export default class ValidateForm extends Vue {
  @Provide()
  public models = {
    email: '',
  }

  private isSubmitted = false
  private isEmailSent = false

  private emailLocal = ''
  private emailDomain = ''
  private readonly emailTrans: Translation = {
    ko: '메일주소를 입력해주세요.',
    en: 'Enter your email address.',
  }
  private readonly sendLinkTrans: Translation = {
    ko: '비밀번호 재설정 안내 이메일을 보내드리겠습니다.',
    en: 'We will send you a link to reset your password.',
  }
  private readonly emailErrorTrans: Translation = {
    ko: '유효한 이메일 주소를 입력해주세요',
    en: 'Please input valid email address',
  }
  private readonly sendTrans: Translation = {
    ko: '메일 전송',
    en: 'Send an e-mail',
  }
  private readonly successTrans: Translation = {
    ko: '비밀번호 재설정 링크가 메일로 전송되었습니다.',
    en: 'Password reset link has been sent to your e-mail.',
  }
  private readonly failTrans: Translation = {
    ko: '메일 전송 실패',
    en: 'Mail delivery failed',
  }

  @Provide()
  private rules = {
    email: [{
      required: true,
      validator: this.validateEmail,
      trigger: 'blur',
    }],
  }

  get lang(): Language {
    return this.$store.state.language
  }

  public validateEmail(rule, value, callback) {
    // TODO: use mailcheck module to suggest and validate correctly?
    if (value === '') {
      callback(new Error(' '))
    } else if (value.split('@').length !== 2) {
      callback(new Error(this.emailErrorTrans[this.lang]))
    } else {
      const emailSplit = value.split('@')
      this.emailLocal = emailSplit[0].trim()
      this.emailDomain = emailSplit[1].trim()
      callback()
    }
  }

  public submitForm() {
    const elementRef = 'findForm'
    const formElement: any = this.$refs[elementRef]
    formElement.validate(async valid => {
      if (valid) {
        this.isSubmitted = true
        await this.sendEmail()
        formElement.resetFields()
        this.isSubmitted = false
      } else {
        return false
      }
    })
  }

  public async sendEmail() {
    const response = await this.$axios.post('/api/user/send-password-token', {
      emailLocal: this.emailLocal,
      emailDomain: this.emailDomain,
    }, { validateStatus: () => true })

    if (response.status !== 200) {
      this.$notify.error(this.failTrans[this.lang])
      return
    }

    this.isEmailSent = true
  }

}
</script>

<style scoped>
.find {
  width: 550px;
  margin-top: 4%;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.button {
  margin-top: 10px;
  width: 80%;
  height: 50px;
  padding: 3px;
  background-color: white;
  border: 2px solid #f2a43e;
  color: black;
  font-size: 16px;
}

.button:hover {
  background-color: #f2a43e;
}

.card-head {
  font-size: 24px;
}

.el-form {
  margin: 40px 20px;
}
</style>
