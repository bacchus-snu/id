<template>
  <div>
    <el-container>
      <el-header>
        <header-menu></header-menu>
      </el-header>
      <el-main>
        <nuxt/>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import TheHeading from '~/components/TheHeading.vue'

@Component({
  components: {
    'the-heading': TheHeading,
  }
})

export default class extends Vue {
  
}
</script>
