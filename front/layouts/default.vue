<template>
  <div>
    <el-container>
      <el-header>
        <header-menu/>
      </el-header>
      <el-main>
        <nuxt/>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import HeaderMenu from '~/components/HeaderMenu.vue'

@Component({
  components: {
    'header-menu': HeaderMenu,
  }
})

export default class extends Vue {
  
}
</script>
