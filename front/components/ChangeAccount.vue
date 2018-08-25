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
          <el-form @submit.native.prevent="sendEmail">
          <el-select v-model="email" placeholder="Please select your email">
            <el-option v-for="email in emailList" :value=email :key="email">{{ email }}</el-option>
          </el-select>
          </el-form>
          <el-button :disabled="isSubmitted||!emailSelected" class="button" type="warning" @click="sendEmail">{{ sendTrans[lang] }}</el-button>
        </el-card>
      </el-col>
      <el-col :span="8" :offset="1">
        <el-card class="account">
          <div slot="header" class="card-head">
          <span>{{ shellTrans[lang] }}</span>
          </div>
          <h2>{{ shellChangeTrans[lang] }}</h2>
          <h2>{{ chooseShellTrans[lang] }}</h2>
          <el-form @submit.native.prevent="changeShell">
          <el-select v-model="shell" placeholder="Please select your shell">
            <el-option v-for="shell in shellList" :value=shell :key="shell">{{ shell }}</el-option>
          </el-select>
          </el-form>
          <el-button :disabled="isRequested||!shellSelected" class="button" type="warning" @click="changeShell">{{ changeTrans[lang] }}</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Provide } from 'nuxt-property-decorator'
import axios from 'axios'
import { Translation, Language } from '../types/translation'

@Component({})
export default class ChangeAccount extends Vue {
  @Prop()
  private readonly shellList: Array<string>
  @Prop()
  private readonly emailList: Array<string>

  private email: string = ''
  private shell: string = ''

  private isSubmitted: boolean = false
  private isRequested: boolean = false

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

  get lang(): Language {
    return this.$store.state.language
  }

  get username(): string {
    return this.$store.state.username
  }

  get emailSelected(): boolean {
    return (this.email !== '')
  }

  get shellSelected(): boolean {
    return (this.shell !== '')
  }

  public async sendEmail() {
    this.isSubmitted = true
    // const response = await axios.post('', {})
    this.email = ''
    this.isSubmitted = false
  }

  public changeShell() {
    this.isRequested = true
    // const response = await axios.post('',{})
    this.shell = ''
    this.isRequested = false
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
