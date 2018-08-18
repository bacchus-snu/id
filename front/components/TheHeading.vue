<template>
  <div>
	  <el-menu active-text-color="#ff7e05" mode="horizontal">
      <el-menu-item index="1" class="topnav alink">
        <a class="div-link" href="https://www.snucse.org">
          <div>
            {{ menuSel[0] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <el-menu-item index="2" class="topnav">
        <nuxt-link to="/">{{ menuSel[1] }}</nuxt-link>
      </el-menu-item>
      <el-menu-item index="3" class="topnav">
        <nuxt-link to="/lab">{{ menuSel[2] }}</nuxt-link>
      </el-menu-item>
      <el-menu-item index="4" class="topnav">
        <nuxt-link to="/appcenter">{{ menuSel[3] }}</nuxt-link>
      </el-menu-item>
      <el-menu-item index="5" class="topnav alink">
        <a class="div-link" href="https://cse.snu.ac.kr">
          <div>
            {{ menuSel[4] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <el-menu-item index="6" class="topnav alink">
        <a class="div-link" href="https://bacchus.snucse.org">
          <div>
            {{ menuSel[5] }}<i class="el-icon-more-outline"></i>
          </div>
        </a>
      </el-menu-item>
      <el-menu-item index="7" class="topnav alink">
        <nuxt-link to="/help">{{ menuSel[6] }}<i class="el-icon-question"></i></nuxt-link>
      </el-menu-item>
      <el-button class="topbutton" type="warning" @click="changeLang">{{ menuSel[7] }}</el-button>
	  </el-menu>
  </div>
</template>

<script lang="ts">
import { Component, Vue} from 'nuxt-property-decorator'

@Component({})

export default class TheHeading extends Vue {

  private menuEng: Array<string> =
    ['SNUCSE', 'Account', 'Support', 'AppCenter', 'Dpt', 'Bacchus', 'help', '한국어']
  private menuKor: Array<string> =
    ['스누씨', '통합계정', '실습지원', '앱센터', '학부', '바쿠스', '도움말', 'English']
  private menuSel: Array<string> = this.menuKor

  public changeLang() {
    this.$store.commit('changeLang')
    if (this.$store.state.language === 'ko') {
      this.menuSel = this.menuKor
    } else {
      this.menuSel = this.menuEng
    }
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
}
.alink:hover:not(.active) {
  background-color: white;
  color: black;
}
.topbutton {
  float: right;
  margin: 4px 10px;
  font-size: 20px;
  color: black;
}
.div-link {
  outline: 0;
}
</style>
