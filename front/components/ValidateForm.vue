<template>
  <el-card class="signup">
  <div slot="header" class=cardHead>
    <span>Sign up</span>
  </div>
  <h2>{{ emailTrans[lang] }}</h2>
  <el-form :model="models" status-icon ref="signupForm" :rules="rules">
    <el-form-item prop="email">
      <el-input v-model="models.email" placeholder="example@snu.ac.kr"></el-input>
    </el-form-item>
  </el-form>
  <el-button class="button" type="warning" @click="submitForm('signupForm')">{{ sendTrans[lang] }}</el-button>
  </el-card>
</template>

<script lang="ts">
import { Component, Prop, Vue, Provide } from 'nuxt-property-decorator'
import axios from 'axios'
import { Translation, Language } from '../types/translation'
import { Account } from '~/types/account'

@Component({})
export default class ValidateForm extends Vue {
  @Provide()
  public models = {
    email: '',
  }
  public $refs!: {
    'signupForm': HTMLElement,
  }

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
  private readonly sendTrans : Translation = {
    ko: '메일 전송',
    en: 'Send an e-mail'
  }
  private readonly successTrans: Translation = {
    ko: '가입 신청 링크가 메일로 전송되었습니다',
    en: 'Signup link has been sended to your e-mail'
  }
  private readonly failTrans: Translation = {
    ko: '메일 전송 실패',
    en: 'Mail delivery failed'
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
    if (value === '') {
      callback(new Error(' '))
    } else if (value.split('@').length !== 2) {
      callback(new Error(this.emailErrorTrans[this.lang]))
    } else {
      const emailSplit = value.split('@')
      this.emailLocal = emailSplit[0]
      this.emailDomain = emailSplit[1]
      callback()
    }
  }

  public submitForm(formName) {
    this.$refs[formName].validate( valid => {
      if (valid) {
        this.sendEmail()
        this.$refs[formName].resetFields()
      } else {
        return false
      }
    })
  }

  public async sendEmail() {
    /*
    const response = await axios.post('', {
      emailLocal: this.emailLocal,
      emailDomain: this.emailDomain,
    })
    if (response.status !== 201) {
      this.$notify.error(this.failTrans[this.lang])
    } else {
      this.$notify.success(this.successTrans[this.lang])
    }
    */
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

.cardHead {
  font-size: 24px;
}

.el-form {
  margin: 40px 20px;
}
</style>
