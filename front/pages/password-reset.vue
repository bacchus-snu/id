<template>
  <div>
    <find-password></find-password>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import FindPassword from '~/components/FindPassword'
import axios from 'axios'

@Component({
  components: {
    'find-password': FindPassword,
  },
})

export default class PasswordResetPage extends Vue {

}
</script>
