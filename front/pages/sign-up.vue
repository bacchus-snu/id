<template>
  <div>
    <sign-up-form :shellList="shellList"></sign-up-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import SignUpForm from '~/components/SignUpForm'
import axios from 'axios'

@Component({
  components: {
    'sign-up-form': SignUpForm,
  },
})
export default class SignUpPage extends Vue {
  private shellList: Array<string>

  private async asyncData() {
    const result = await axios.get('/api/shells')
    this.shellList = result.data
  }

}
</script>
