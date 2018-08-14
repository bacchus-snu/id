<template>
  <div>
	  <el-menu :default-active="isActive" mode="horizontal">
        <el-menu-item class="limenu lilink"><a href="http://www.snucse.org">{{menuSel[0]}}  <i class="el-icon-more-outline"></i></a></el-menu-item>
        <el-menu-item name="nav" class="limenu"><nuxt-link to="/">{{menuSel[1]}}</nuxt-link></el-menu-item>
        <el-menu-item name="nav" class="limenu"><nuxt-link to="/support">{{menuSel[2]}}</nuxt-link></el-menu-item>
        <el-menu-item name="nav" class="limenu"><nuxt-link to="/appcenter">{{menuSel[3]}}</nuxt-link></el-menu-item>
        <el-menu-item class="limenu lilink"><a href="http://cse.snu.ac.kr">{{menuSel[4]}}  <i class="el-icon-more-outline"></i></a></el-menu-item>
        <el-menu-item class="limenu lilink"><a href="http://bacchus.snucse.org">{{menuSel[5]}}  <i class="el-icon-more-outline"></i></a></el-menu-item>
        <el-menu-item class="limenu lilink" @click="selectMenu(3)"><nuxt-link to="/help">{{menuSel[6]}}  <i class="el-icon-question"></i></nuxt-link></el-menu-item>
        <el-menu-item class="libutton"><el-button class="button" type="primary" @click="changeLang"> {{menuSel[7]}}</el-button></el-menu-item>
	  </el-menu>	
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'

@Component({})

export default class HeaderMenu extends Vue {

  private menuEng: Array<string> = ['SNUCSE','Account','Support','AppCenter','Dpt','Bacchus','help','한국어']
  private menuKor: Array<string> = ['스누씨','통합계정','실습지원','앱센터','학부','바쿠스','도움말','English']
  private menuSel: Array<string> = this.menuKor
  public active: Array<boolean> = this.$store.state.menu

  changeLang() {
    this.$store.commit('changeLang')
    if (this.$store.state.language === 'ko') {
	  this.menuSel = this.menuKor
	}
    else {
	  this.menuSel = this.menuEng
	}
  }
}
</script>

<style scoped>
.isActive {
  float: left;
}
.isActive a {
  color: black;
  font-size: 20px;
  padding: 16px 16px 10px 16px;
  text-decoration: none;
  margin: 0 20px;
  border-bottom: 2px solid orange;  
}
.limenu {
  float: left;
}
.limenu a {
  color: black;
  font-size: 20px;
  padding: 14px 16px;
  text-decoration: none;
  margin: 0 20px;
  border-radius: 4px;
}
.limenu a:hover {
  background-color: #f2a43e;
}
.lilink a {
  font-size: 16px;
  color: rgb(255, 123, 0);
  padding: 16px 16px;
  margin: 0 8px;
}
.lilink a:hover {
  color: #f2a43e;
}
.libutton {
  float: right;
}
.libutton button {
  background-color: white;
  padding: 16px 18px;
  border: none;
  color: black;
  font-size: 20px;
}
.libutton button:hover {
  background-color: #f2a43e;
}
</style>
