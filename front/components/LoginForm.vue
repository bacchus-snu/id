<template>
  <div class="login">
  <h2> {{ menuSel[0] }} </h2>
  <el-form>
    <el-form-item label="username">
      <el-input v-model="username" size="small"/>
    </el-form-item>
    <el-form-item label="password">
      <el-input v-model="password" size="small"/>
    </el-form-item>
    <el-form-item>
      <el-button class="button" type="warning" @click="onLogin"> {{ menuSel[1] }} </el-button>
    </el-form-item>
  </el-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'

export default class LoginForm extends Vue {

  public username: string = ''
  public password: string = ''
  private menuEng: Array<string> =
    ['Please login to manage your integrated account.', 'Login']
  private menuKor: Array<string> =
    ['통합 계정 관리를 위해 로그인하십시오.', '로그인 ']

  get menuSel() {
    return (this.lang === 'ko') ? this.menuKor : this.menuEng
  }

  get lang() {
    return this.$store.state.language
  }

  public async onLogin() {
    if (!this.username || !this.password) {
      this.$notify.error('Field error!')
      return
    }
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
