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
  private shellList: Array<string> = []

  public async mounted() {
    const token = this.$route.query.token
    if (!token) {
      this.$router.push('/')
    }

    const response = await axios.post('/api/email/check-token', { token }, {
      validateStatus: () => true,
    })

    if (response.status !== 200) {
      this.$router.push('/')
    }

    this.$store.commit('changeEmail', response.data)
  }

  private async asyncData() {
    const result = await axios.get('/api/shells', {
      validateStatus: () => true,
    })
    return { shellList : result.data.shells }
  }

}
</script>
