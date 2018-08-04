<template>
  <div>
    <el-card>
      <template slot="header">
        <h2>Header test</h2>
      </template>
      <el-button plain type="primary" @click="onClick">Click me</el-button>
    </el-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator';
@Component({})
export default class TestComponent extends Vue {

  onClick(): void {
    console.log(new Date());
  }

}
</script>
