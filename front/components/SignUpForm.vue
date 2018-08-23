<template>
  <el-card class="signup">
  <div slot="header" class=cardHead>
    <span>Sign up</span>
  </div>
  <el-form @submit.native.prevent="submitForm" :model="models" status-icon size="medium" ref="signupForm" :rules="rules" label-width="150px">
    <el-form-item :label="nameTrans[lang]" prop="name" required>
      <el-input v-model="models.name"></el-input>
    </el-form-item>
    <el-form-item :label="usernameTrans[lang]" prop="username">
      <el-input v-model="models.username"></el-input>
    </el-form-item>
    <el-form-item :label="pwdTrans[lang]" prop="password">
      <el-input type="password" v-model="models.password"></el-input>
    </el-form-item>
    <el-form-item :label="checkTrans[lang]" prop="pwdcheck">
      <el-input type="password" v-model="models.pwdcheck"></el-input>
    </el-form-item>
    <el-form-item :label="shellTrans[lang]" prop="shell">
      <el-select v-model="models.shell" placeholder="Please select your shell">
      <el-option v-for="shell in shellList" :value=shell :key="shell">{{ shell }}</el-option>
      </el-select>
    </el-form-item>
  </el-form>
  <el-button class="button" type="warning" @click="submitForm('signupForm')">{{ createTrans[lang] }}</el-button>
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
    shell: '',
  }

  @Prop()
  private readonly shellList: Array<string>
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
  private readonly shellTrans: Translation = {
    ko: '쉘',
    en: 'Shell',
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
    en: 'The password should be at leat 8 characters',
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
      message: ' ',
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
    shell: [{
      required: true,
      message: ' ',
      trigger: 'change',
    }],
  }

  get lang(): Language {
    return this.$store.state.language
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

  public submitForm(formName) {
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
    /*
    const response = await axios.post('', {
      name: this.models.name,
      username: this.models.username,
      password: this.models.password,
      shell: this.models.shell,
      preferredLanguage: this.lang,
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

.el-form-item {
  width: 90%;
}

.el-select {
  width: 100%;
}

.cardHead {
  font-size: 24px;
}
</style>
