<template>
  <div class="login">
  <h2> {{ pleaseLoginTrans[lang] }} </h2>
  <h3>{{ youCanTrans[lang] }}</h3>
  <el-form @submit.native.prevent="onLogin" status-icon>
    <el-form-item label="Username">
      <el-input @keyup.native.enter="onLogin" :disabled="isLoggingIn" v-model="username" required size="small"/>
    </el-form-item>
    <el-form-item label="Password">
      <el-input @keyup.native.enter="onLogin" :disabled="isLoggingIn" type="password" v-model="password" required size="small"/>
      <nuxt-link to="/password-reset">
      <div class="forgot">
      {{ forgotTrans[lang] }}
      </div>
      </nuxt-link>
    </el-form-item>
    <el-form-item>
      <el-button class="button" :disabled="isLoggingIn" type="warning" @click="onLogin">
      {{ loginTrans[lang] }}
      </el-button>
      <div>
      {{ orTrans[lang] }}
      <nuxt-link to="/verify">
        <div class="signup">
        {{ signupTrans[lang] }}
        </div>
      </nuxt-link>
      </div>
    </el-form-item>
  </el-form>

  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import { Translation, Language } from '../types/translation'

@Component({})
export default class LoginForm extends Vue {

  private username = ''
  private password = ''
  private isLoggingIn = false
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
  private readonly orTrans: Translation = {
    ko: '아직 계정이 없으신가요?',
    en: 'or',
  }
  private readonly youCanTrans: Translation = {
    ko: '기존 통합계정으로도 로그인이 가능합니다.',
    en: 'You can still use the service with existing SNUCSE account.',
  }
  private readonly signupTrans: Translation = {
    ko: '가입 신청하기',
    en: 'Sign up',
  }
  private readonly forgotTrans: Translation = {
    ko: '비밀번호를 잊으셨나요?',
    en: 'Forgot your password?',
  }

  private async mounted() {
    const response = await this.$axios.get('/api/check-login', {
      validateStatus: () => true,
    })

    if (response.status === 200 && response.data.username) {
      this.$store.commit('changeUsername', response.data.username)
      this.$router.push('/my-page')
    }
  }

  get lang(): Language {
    return this.$store.state.language
  }

  private async onLogin() {
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

    const response = await this.$axios.post('/api/login', data, {
      validateStatus: () => true,
    })
    this.isLoggingIn = false

    if (response.status !== 200) {
      this.$notify.error(this.loginFailedTrans[this.lang])
      return
    }

    this.$store.commit('changeUsername', this.username)

    await this.$router.push('/my-page')
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

.signup {
  margin-left: 5px;
  font-size: 16px;
  color: #ff6105;
  display: inline;
}

.signup:hover {
  font-weight: bold;
}

.forgot {
  float: right;
  color: #ff6105;
}

.forgot:hover {
  font-weight: bold;
}
</style>
