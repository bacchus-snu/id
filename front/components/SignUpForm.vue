<template>
  <el-form>
  </el-form>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'nuxt-property-decorator'
import axios from 'axios'

@Component({})
export default class SignUpForm extends Vue {
  @Prop()
  private readonly shellList: Array<string> = []

}
</script>
