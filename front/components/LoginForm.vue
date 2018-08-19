<template>
  <div class="login">
  <h2> {{ pleaseLoginTrans[lang] }} </h2>
  <el-form>
    <el-form-item label="Username">
      <el-input :disabled="isLoggingIn" v-model="username" size="small"/>
    </el-form-item>
    <el-form-item label="Password">
      <el-input :disabled="isLoggingIn" type="password" v-model="password" size="small"/>
    </el-form-item>
    <el-form-item>
      <el-button class="button" :disabled="isLoggingIn" type="warning" @click="onLogin">
        {{ loginTrans[lang] }}
      </el-button>
    </el-form-item>
  </el-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'
import { Translation, Language } from '../types/translation'

@Component({})
export default class LoginForm extends Vue {

  private username: string = ''
  private password: string = ''
  private isLoggingIn: boolean = false
  private readonly pleaseLoginTrans: Translation = {
    ko: '통합 계정 관리를 위해 로그인하십시오.',
    en: 'Please login to manage your integrated account.',
  }
  private readonly loginTrans: Translation = {
    ko: '로그인',
    en: 'Sign in',
  }
  private readonly loginFieldErrorTrans: Translation = {
    ko: '항목을 모두 입력해주세요.',
    en: 'Please fill out all fields.',
  }
  private readonly loginFailedTrans: Translation = {
    ko: '로그인에 실패했습니다.',
    en: 'Failed to sign in.',
  }

  get lang(): Language {
    return this.$store.state.language
  }

  public async onLogin() {
    if (!this.username || !this.password) {
      this.$notify.error(this.loginFieldErrorTrans[this.lang])
      return
    }

    if (this.isLoggingIn) {
      return
    }

    this.isLoggingIn = true

    const data = {
      username: this.username,
      password: this.password,
    }

    const response = await axios.post('/api/login', data, {
      validateStatus: () => true,
    })
    this.isLoggingIn = false

    if (response.status !== 200) {
      this.$notify.error(this.loginFailedTrans[this.lang])
      return
    }

    this.$store.commit('changeUsername', this.username)

    this.username = ''
    this.password = ''
  }

}
</script>

<style scoped>
.el-form {
  margin-top: 50px;
}

.login {
  width: 400px;
  height: 380px;
  margin-top: 8%;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  vertical-align: middle;
}

.button {
  margin-top: 20px;
  width: 120px;
  height: 30px;
  padding: 3px;
  background-color: white;
  border: 2px solid #f2a43e;
  color: black;
}

.button:hover {
  background-color: #f2a43e;
}
</style>
