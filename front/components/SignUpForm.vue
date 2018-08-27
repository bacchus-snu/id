<template>
  <el-card class="signup">
  <div slot="header" class="card-head">
    <span>Sign up</span>
  </div>
  <el-form @submit.native.prevent="submitForm" :model="models" status-icon size="medium" ref="signupForm" :rules="rules" label-width="150px">
    <el-form-item :label="nameTrans[lang]" prop="name">
      <el-input v-model="models.name"></el-input>
    </el-form-item>
    <el-form-item :label="usernameTrans[lang]" prop="username" style="margin-bottom: 40px">
      <el-input v-model="models.username"></el-input>
    </el-form-item>
    <el-form-item :label="pwdTrans[lang]" prop="password">
      <el-input type="password" v-model="models.password"></el-input>
    </el-form-item>
    <el-form-item :label="checkTrans[lang]" prop="pwdcheck">
      <el-input type="password" v-model="models.pwdcheck"></el-input>
    </el-form-item>
  </el-form>
  <el-button class="button" type="warning" @click="submitForm">{{ createTrans[lang] }}</el-button>
  </el-card>
</template>

<script lang="ts">
import { Component, Prop, Vue, Provide } from 'nuxt-property-decorator'
import axios from 'axios'
import { Translation, Language } from '../types/translation'
import { Account } from '~/types/account'

@Component({})
export default class SignUpForm extends Vue {
  @Provide()
  public models: Account = {
    name: '',
    username: '',
    password: '',
    pwdcheck: '',
  }

  private readonly nameTrans: Translation = {
    ko: '이름',
    en: 'Name',
  }
  private readonly usernameTrans: Translation = {
    ko: '아이디',
    en: 'Username',
  }
  private readonly pwdTrans: Translation = {
    ko: '비밀번호',
    en: 'Password',
  }
  private readonly checkTrans: Translation = {
    ko: '비밀번호 확인',
    en: 'Confirm password',
  }
  private readonly createTrans: Translation = {
    ko: '계정 생성',
    en: 'Create an account',
  }
  private readonly successTrans: Translation = {
    ko: '계정이 생성되었습니다',
    en: 'Your account is created',
  }
  private readonly failTrans: Translation = {
    ko: '계정 생성 실패',
    en: 'Account not created',
  }
  private readonly pwdErrorTrans: Translation = {
    ko: '비밀번호가 다릅니다',
    en: 'The password does not match',
  }
  private readonly lengthErrorTrans: Translation = {
    ko: '비밀번호는 최소 8자리여야 합니다',
    en: 'The password should be at least 8 characters',
  }
  private readonly usernameValidateTrans: Translation = {
    ko: '유저명은 영문자 소문자로 시작하고 영문자 소문자, 숫자, _ 만 포함된 20자 이하여야 합니다.',
    en: 'Username should be under 20 letters which only contains ' +
    'lowercase alphabet, numbers, or underscores and starts with lowercase alphabet.',
  }

  @Provide()
  private rules = {
    name: [{
      required: true,
      message: ' ',
      trigger: 'blur',
    }],
    username: [{
      required: true,
      validator: this.validateUsername,
      max: 20,
      trigger: 'blur',
    }],
    password: [{
      required: true,
      min: 8,
      message: this.lengthErrorTrans[this.lang],
      trigger: 'blur',
    }],
    pwdcheck: [{
      required: true,
      validator: this.validatePassword,
      trigger: 'blur',
    }],
  }

  get lang(): Language {
    return this.$store.state.language
  }

  public validateUsername(rule, value, callback) {
    if (!/^[a-z][a-z0-9_]+$/.test(value) || value.length > 20) {
      callback(new Error(this.usernameValidateTrans[this.lang]))
    } else {
      callback()
    }
  }

  public validatePassword(rule, value, callback) {
    // TODO: more password rules?
    if (value === '') {
      callback(new Error(' '))
    } else if (value !== this.models.password) {
      callback(new Error(this.pwdErrorTrans[this.lang]))
    } else {
      callback()
    }
  }

  public submitForm() {
    const elementRef = 'signupForm'
    const formElement: any = this.$refs[elementRef]
    formElement.validate( valid => {
      if (valid) {
        this.signUpAccount()
        formElement.resetFields()
      } else {
        return false
      }
    })
  }

  public async signUpAccount() {
    const response = await axios.post('/api/user', {
      name: this.models.name,
      username: this.models.username,
      password: this.models.password,
      preferredLanguage: this.lang,
    }, { validateStatus: () => true })

    if (response.status !== 201) {
      this.$notify.error(this.failTrans[this.lang])
      return
    }

    this.$notify.success(this.successTrans[this.lang])
    this.$router.push('/')
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

.el-form-item {
  width: 90%;
}

.el-select {
  width: 100%;
}

.card-head {
  font-size: 24px;
}
</style>
