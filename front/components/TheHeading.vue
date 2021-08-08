<template>
  <div>
    <el-menu active-text-color="#ff7e05" mode="horizontal" default-active="2">
      <el-menu-item index="1" class="topnav alink">
        <a class="div-link" href="https://www.snucse.org">
          <div>
            {{ snucseTrans[lang] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <el-menu-item @click="routeTo('/')" index="2" class="topnav">
        {{ accountTrans[lang] }}
      </el-menu-item>
      <!--
      <el-menu-item @click="routeTo('/lab-support')" index="3" class="topnav">
        {{ labSupportTrans[lang] }}
      </el-menu-item>
      -->
      <!--
      <el-menu-item @click="routeTo('/appcenter')" index="4" class="topnav">
         {{ appCenterTrans[lang] }}
      </el-menu-item>
      -->
      <el-menu-item index="5" class="topnav alink">
        <a class="div-link" href="https://cse.snu.ac.kr">
          <div>
            {{ dptTrans[lang] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <el-menu-item index="6" class="topnav alink">
        <a class="div-link" href="https://bacchus.snucse.org">
          <div>
            {{ bacchusTrans[lang] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <!--
      <el-menu-item @click="routeTo('/help')" index="7" class="topnav alink">
        {{ helpTrans[lang] }}<i class="el-icon-question"></i>
      </el-menu-item>
      -->
      <el-button class="topbutton" type="warning" @click="changeLang">{{ langTrans[lang] }}</el-button>
      <el-button class="topbutton" v-if="loggedIn" :disabled="isLoggingOut" type="warning" @click="onLogout">{{ logoutTrans[lang] }}</el-button>
    </el-menu>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import { Translation, Language } from '../types/translation'
import axios from 'axios'
import { AxiosResponse } from 'axios'

@Component({})
export default class TheHeading extends Vue {
  private isLoggingOut = false
  private readonly snucseTrans: Translation = {
    ko: '스누씨',
    en: 'SNUCSE',
  }

  private readonly accountTrans: Translation = {
    ko: '통합계정',
    en: 'Account',
  }

  private readonly labSupportTrans: Translation = {
    ko: '실습지원',
    en: 'Lab Support',
  }

  private readonly appCenterTrans: Translation = {
    ko: '앱센터',
    en: 'AppCenter',
  }

  private readonly dptTrans: Translation = {
    ko: '학부',
    en: 'Dpt',
  }

  private readonly bacchusTrans: Translation = {
    ko: '바쿠스',
    en: 'Bacchus',
  }

  private readonly helpTrans: Translation = {
    ko: '도움말',
    en: 'Help',
  }

  private readonly langTrans: Translation = {
    ko: 'English',
    en: '한국어',
  }

  private readonly logoutTrans: Translation = {
    ko: '로그아웃',
    en: 'Logout',
  }

  public changeLang() {
    this.$store.commit('changeLang')
  }

  get lang(): Language {
    return this.$store.state.language
  }

  get loggedIn(): boolean {
    return (this.$store.state.username !== '')
  }

  public routeTo(route: string) {
    this.$router.push(route)
  }

  private async mounted() {
    const response = await axios.get('/api/check-login', {
      validateStatus: () => true,
    })

    if (response.status === 200 && response.data.username) {
      this.$store.commit('changeUsername', response.data.username)
    }
  }

  private async onLogout() {
    if (this.isLoggingOut) {
      return
    }

    this.isLoggingOut = true

    const result = await axios.get('/api/logout', {
      validateStatus: () => true,
    })

    this.isLoggingOut = false

    this.$store.commit('changeUsername', '')
    this.$router.push('/')
  }
}
</script>

<style scoped>
.topnav {
  color: black;
  font-size: 20px;
  margin: 0px 15px;
  display: block;
}
.topnav:hover:not(.active) {
  color: #ff7e05;
}
.alink {
  font-size: 16px;
  color: #4b4a4a;
  padding: 0px;
}
.alink:hover:not(.active) {
  background-color: white;
  color: black;
}
.topbutton {
  float: right;
  margin: 4px 10px;
  font-size: 18px;
  color: black;
}
.div-link {
  outline: 0;
}
.div-link div {
  margin: 0px 20px;
}
</style>
