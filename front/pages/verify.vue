<template>
  <div>
    <email-verification></email-verification>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import EmailVerification from '~/components/EmailVerification'

@Component({
  components: {
    'email-verification': EmailVerification,
  },
})
export default class VerificationPage extends Vue {

}
</script>
