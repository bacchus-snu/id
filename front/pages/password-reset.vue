<template>
  <div>
    <find-password></find-password>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import FindPassword from '~/components/FindPassword'

@Component({
  components: {
    'find-password': FindPassword,
  },
})

export default class PasswordResetPage extends Vue {

}
</script>
