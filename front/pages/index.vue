<template>
  <div>
    <login-form></login-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import LoginForm from '~/components/LoginForm'

@Component({
  components: {
    'login-form': LoginForm,
  },
})
export default class IndexPage extends Vue {

}
</script>
