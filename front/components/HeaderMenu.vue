<template>
  <div>
	  <ul class="ulhead">
      <li class="lilink"><a href="http://www.snucse.org">{{menuSel[0]}}  <i class="el-icon-more-outline"></i></a></li>
      <li name="nav" class="isActive" @click="selectMenu(0)"><nuxt-link to="/">{{menuSel[1]}}</nuxt-link></li>
      <li name="nav" class="limenu" @click="selectMenu(1)"><nuxt-link to="/support">{{menuSel[2]}}</nuxt-link></li>
      <li name="nav" class="limenu" @click="selectMenu(2)"><nuxt-link to="/appcenter">{{menuSel[3]}}</nuxt-link></li>
      <li class="lilink"><a href="http://cse.snu.ac.kr">{{menuSel[4]}}  <i class="el-icon-more-outline"></i></a></li>
      <li class="lilink"><a href="http://bacchus.snucse.org">{{menuSel[5]}}  <i class="el-icon-more-outline"></i></a></li>
      <li class="lilink" @click="selectMenu(3)"><nuxt-link to="/help">{{menuSel[6]}}  <i class="el-icon-question"></i></nuxt-link></li>
      <li class="libutton"><el-button class="button" type="primary" @click="changeLang"> {{menuSel[7]}}</el-button></li>
	  </ul>	
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'

@Component({})

export default class HeaderMenu extends Vue {

  public lang: string = this.$store.state.language
  private menuEng: Array<string> = ['SNUCSE','Account','Support','AppCenter','Dpt','Bacchus','help','한국어']
  private menuKor: Array<string> = ['스누씨','통합계정','실습지원','앱센터','학부','바쿠스','도움말','English']
  private menuSel: Array<string> = this.menuKor
  private active: Array<boolean> = this.$store.state.menu

  changeLang() {
    this.$store.commit('changeLang')
    if (this.$store.state.language === 'ko') this.menuSel = this.menuKor
    else this.menuSel = this.menuEng
  }

  selectMenu(num) {
    this.$store.commit('selectMenu', num)
    this.active = this.$store.state.menu
    var navs = document.getElementsByName("nav")
    for (var i=0; i<this.active.length-1; i++){
      if (this.active[i]==true) navs[i].className = "isActive"
      else navs[i].className = "limenu"
    }
  }
}
</script>

<style scoped>
.ulhead {
  list-style-type: none;
  margin: 0;
  overflow: hidden;
  background-color: white;
  padding: 0;
  text-align: center;
}
.isActive {
  float: left;
}
.isActive a {
  display: block;
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
  display: block;
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
.selmenu a {
  display: block;
  color: black;
  font-size: 20px;
  padding: 14px 16px;
  text-decoration: none;
  margin: 0 20px;
  border-radius: 4px;
  background-color: #f2a43e;
}
.lilink {
  float: left;
}
.lilink a {
  display: block;
  text-align: center;
  text-decoration: none;
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
  display: block;
  font-size: 20px;
}
.libutton button:hover {
  background-color: #f2a43e;
}
</style>
