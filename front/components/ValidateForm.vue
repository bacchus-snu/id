<template>
  <el-card class="signup">
  <div slot="header" class="card-head">
    <span>Sign up</span>
  </div>
  <template v-if="!isEmailSent">
    <h2>{{ emailTrans[lang] }}</h2>
    <el-form @submit.native.prevent="submitForm" :model="models" status-icon ref="signupForm" :rules="rules">
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
import axios from 'axios'
import { Translation, Language } from '../types/translation'

@Component({})
export default class ValidateForm extends Vue {
  @Provide()
  public models = {
    email: '',
  }

  private isSubmitted: boolean = false
  private isEmailSent: boolean = false

  private emailLocal: string = ''
  private emailDomain: string = ''
  private readonly emailTrans: Translation = {
    ko: '회원가입 링크를 받을 메일을 입력해주세요.',
    en: 'Please input your e-mail to receive sign up link.',
  }
  private readonly emailErrorTrans: Translation = {
    ko: '유효한 이메일 주소를 입력해주세요',
    en: 'Please input valid email address',
  }
  private readonly snuEmailOnlyTrans: Translation = {
    ko: 'snu.ac.kr 도메인으로만 가입이 가능합니다.',
    en: 'Only snu.ac.kr domain can be used.',
  }
  private readonly sendTrans: Translation = {
    ko: '메일 전송',
    en: 'Send an e-mail',
  }
  private readonly successTrans: Translation = {
    ko: '가입 신청 링크가 메일로 전송되었습니다.',
    en: 'Sign up link has been sent to your e-mail.',
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
    } else if (value.split('@')[1].trim() !== 'snu.ac.kr') {
      callback(new Error(this.snuEmailOnlyTrans[this.lang]))
    } else {
      const emailSplit = value.split('@')
      this.emailLocal = emailSplit[0].trim()
      this.emailDomain = emailSplit[1].trim()
      callback()
    }
  }

  public submitForm() {
    const elementRef = 'signupForm'
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
    const response = await axios.post('/api/email/verify', {
      emailLocal: this.emailLocal,
      emailDomain: this.emailDomain,
    }, { validateStatus: () => true })
    if (response.status !== 200) {
      this.$notify.error(this.failTrans[this.lang])
      return
    }

    // this.$notify.success(this.successTrans[this.lang])
    this.isEmailSent = true
  }

}
</script>

<style scoped>
.signup {
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
